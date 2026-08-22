import { analyzeRemotePolicy } from "@/server/ai";
import type { StructuredAiClient } from "@/server/ai";
import { createRepositories } from "@/server/db";
import {
  fetchPage,
  recordSourceFetchResult,
  requiresFetchAttention,
} from "@/server/fetch";
import type { PageFetchResult } from "@/server/fetch";
import { createChangeCandidatesFromAnalysis } from "@/server/reviews";
import type { CompanyChangeCandidate } from "@/types/company";
import type { CompanyUpdateProgress } from "@/types/update-run";
import { idSchema } from "@/validation/company";

export type CompanyPageFetcher = (url: string) => Promise<PageFetchResult>;

export interface CheckCompanyDependencies {
  pageFetcher: CompanyPageFetcher;
  aiClient: StructuredAiClient;
  now: () => string;
}

export interface RetryableCheckFailure {
  code: string;
  sourceId: string | null;
  kind: "fetch" | "ai" | "internal";
  message: string;
}

const RETRY_ERROR_PREFIX = "REMOTORY_RETRY:";

export class RetryableCompanyCheckError extends Error {
  constructor(readonly failure: RetryableCheckFailure) {
    super(`${RETRY_ERROR_PREFIX}${JSON.stringify(failure)}`);
    this.name = "RetryableCompanyCheckError";
  }
}

export function parseRetryableCheckFailure(
  error: unknown,
): RetryableCheckFailure {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith(RETRY_ERROR_PREFIX)) {
    try {
      const parsed = JSON.parse(message.slice(RETRY_ERROR_PREFIX.length)) as
        RetryableCheckFailure | undefined;
      if (
        parsed &&
        typeof parsed.code === "string" &&
        (parsed.sourceId === null || typeof parsed.sourceId === "string") &&
        ["fetch", "ai", "internal"].includes(parsed.kind) &&
        typeof parsed.message === "string"
      ) {
        return parsed;
      }
    } catch {
      // Fall through to a generic, non-sensitive description.
    }
  }
  return {
    code: "WORKFLOW_STEP_FAILED",
    sourceId: null,
    kind: "internal",
    message: "企業の確認処理に失敗しました",
  };
}

function hasConflictingCandidates(
  candidates: CompanyChangeCandidate[],
): boolean {
  const valuesByField = new Map<string, Set<string | null>>();
  for (const candidate of candidates) {
    const values = valuesByField.get(candidate.fieldName) ?? new Set();
    values.add(candidate.newValue);
    valuesByField.set(candidate.fieldName, values);
  }
  return [...valuesByField.values()].some((values) => values.size > 1);
}

function minimum(values: number[]): number | null {
  return values.length > 0 ? Math.min(...values) : null;
}

function safeErrorMessage(messages: string[]): string | null {
  const value = [...new Set(messages)].join(" / ").trim();
  return value ? value.slice(0, 2_000) : null;
}

export async function checkCompany(
  db: D1Database,
  input: { companyId: string; checkId: string },
  dependencies: Partial<CheckCompanyDependencies> &
    Pick<CheckCompanyDependencies, "aiClient">,
): Promise<CompanyUpdateProgress> {
  const companyId = idSchema.parse(input.companyId);
  const checkId = idSchema.parse(input.checkId);
  const pageFetcher = dependencies.pageFetcher ?? fetchPage;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const repositories = createRepositories(db);
  const company = await repositories.companies.findById(companyId);
  const check = await repositories.companyChecks.findById(checkId);
  if (!company || !check || check.companyId !== companyId) {
    throw new RetryableCompanyCheckError({
      code: "CHECK_CONTEXT_INVALID",
      sourceId: null,
      kind: "internal",
      message: "確認対象を読み込めませんでした",
    });
  }

  const sources =
    await repositories.companySources.listActiveByCompany(companyId);
  const completedAt = now();
  if (sources.length === 0) {
    await repositories.companyChecks.update(checkId, {
      completedAt,
      status: "needs_review",
      contentChanged: null,
      aiUsed: false,
      errorCode: "NO_ACTIVE_SOURCES",
      errorMessage: "有効な情報源が登録されていません",
    });
    return { outcome: "needs_review", candidateCount: 0 };
  }

  let sawChanged = false;
  let sawUnchanged = false;
  let aiUsed = false;
  let requiresReview = false;
  let hasFailure = false;
  const confidenceValues: number[] = [];
  const errorCodes: string[] = [];
  const errorMessages: string[] = [];
  const acceptedHashes: Array<{ sourceId: string; hash: string }> = [];

  for (const source of sources) {
    const result = await pageFetcher(source.url);
    if (!result.ok && result.retryable) {
      throw new RetryableCompanyCheckError({
        code: result.code,
        sourceId: source.id,
        kind: "fetch",
        message: result.detail,
      });
    }

    const assessment = await recordSourceFetchResult(
      repositories.companySources,
      source.id,
      result,
      now(),
    );
    if (!assessment) {
      throw new RetryableCompanyCheckError({
        code: "SOURCE_STATE_FAILED",
        sourceId: source.id,
        kind: "internal",
        message: "情報源の取得状態を保存できませんでした",
      });
    }

    if (!result.ok) {
      hasFailure = true;
      requiresReview ||=
        assessment.requiresReview ||
        requiresFetchAttention(
          assessment.source.consecutiveFailures,
          company.lastVerifiedAt,
          new Date(completedAt),
        );
      errorCodes.push(result.code);
      errorMessages.push(result.detail);
      continue;
    }

    if (assessment.outcome === "unchanged") sawUnchanged = true;
    if (assessment.outcome !== "changed") continue;

    sawChanged = true;
    aiUsed = true;
    const aiResult = await analyzeRemotePolicy(dependencies.aiClient, {
      companyName: company.name,
      sourceUrl: result.finalUrl,
      normalizedText: result.normalizedText,
    });
    if (!aiResult.ok) {
      if (aiResult.retryable) {
        throw new RetryableCompanyCheckError({
          code: aiResult.code,
          sourceId: source.id,
          kind: "ai",
          message: aiResult.message,
        });
      }
      requiresReview = true;
      errorCodes.push(aiResult.code);
      errorMessages.push(aiResult.message);
      continue;
    }

    confidenceValues.push(aiResult.analysis.confidence);
    const candidateResult = await createChangeCandidatesFromAnalysis(db, {
      companyId,
      checkId,
      analysis: aiResult.analysis,
    });
    if (!candidateResult.ok) {
      throw new RetryableCompanyCheckError({
        code: "CANDIDATE_STORAGE_FAILED",
        sourceId: source.id,
        kind: "internal",
        message: "変更候補を保存できませんでした",
      });
    }

    if (candidateResult.issues.length > 0) {
      requiresReview = true;
      errorCodes.push("CANDIDATE_ISSUES");
      errorMessages.push("根拠不足または安全側の判定により確認が必要です");
      continue;
    }
    acceptedHashes.push({ sourceId: source.id, hash: result.contentHash });
  }

  const candidates =
    await repositories.companyChangeCandidates.listByCheck(checkId);
  if (hasConflictingCandidates(candidates)) {
    requiresReview = true;
    errorCodes.push("MULTI_SOURCE_CONFLICT");
    errorMessages.push("複数の情報源で異なる変更候補が検出されました");
  }

  for (const accepted of acceptedHashes) {
    await repositories.companySources.commitContentHash(
      accepted.sourceId,
      accepted.hash,
    );
  }

  const status = requiresReview
    ? "needs_review"
    : hasFailure
      ? "failed"
      : candidates.length > 0
        ? "changed"
        : "success";
  const outcome: CompanyUpdateProgress["outcome"] =
    status === "success" ? "unchanged" : status;
  const contentChanged = sawChanged ? true : sawUnchanged ? false : null;

  await repositories.companyChecks.update(checkId, {
    completedAt,
    status,
    contentChanged,
    aiUsed,
    aiConfidence: minimum(confidenceValues),
    errorCode: errorCodes[0] ?? null,
    errorMessage: safeErrorMessage(errorMessages),
  });

  if (status === "success" && contentChanged !== null) {
    await repositories.companies.markVerified(companyId, completedAt);
  }

  return { outcome, candidateCount: candidates.length };
}

export async function finalizeRetryableCompanyFailure(
  db: D1Database,
  input: { checkId: string; failure: RetryableCheckFailure },
  now = () => new Date().toISOString(),
): Promise<CompanyUpdateProgress> {
  const checkId = idSchema.parse(input.checkId);
  const repositories = createRepositories(db);
  const completedAt = now();
  let requiresReview = false;

  if (input.failure.kind === "fetch" && input.failure.sourceId) {
    const source = await repositories.companySources.recordFetchFailure(
      input.failure.sourceId,
      completedAt,
    );
    const check = await repositories.companyChecks.findById(checkId);
    const company = check
      ? await repositories.companies.findById(check.companyId)
      : null;
    if (source) {
      requiresReview = requiresFetchAttention(
        source.consecutiveFailures,
        company?.lastVerifiedAt ?? null,
        new Date(completedAt),
      );
    }
  }
  await repositories.companyChecks.update(checkId, {
    completedAt,
    status: requiresReview ? "needs_review" : "failed",
    contentChanged: null,
    aiUsed: input.failure.kind === "ai",
    aiConfidence: null,
    errorCode: input.failure.code,
    errorMessage: input.failure.message,
  });
  return {
    outcome: requiresReview ? "needs_review" : "failed",
    candidateCount: 0,
  };
}

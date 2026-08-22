import {
  SOURCE_FAILURE_REVIEW_THRESHOLD,
  SOURCE_STALE_MONTHS,
} from "@/server/fetch/constants";
import type { PageFetchResult } from "@/server/fetch/types";
import type { CompanySource } from "@/types/company";
import { idSchema, sourceFetchRecordSchema } from "@/validation/company";

export interface SourceFetchStateRepository {
  findById(id: string): Promise<CompanySource | null>;
  recordFetchSuccess(
    id: string,
    checkedAt: string,
    observedContentHash: string,
  ): Promise<CompanySource | null>;
  recordFetchFailure(
    id: string,
    checkedAt: string,
  ): Promise<CompanySource | null>;
}

export type SourceFetchOutcome =
  "baseline" | "unchanged" | "changed" | "failed";

export interface SourceFetchAssessment {
  source: CompanySource;
  outcome: SourceFetchOutcome;
  contentChanged: boolean | null;
  observedContentHash: string | null;
  requiresReview: boolean;
}

export async function recordSourceFetchResult(
  repository: SourceFetchStateRepository,
  sourceId: string,
  result: PageFetchResult,
  checkedAt = new Date().toISOString(),
): Promise<SourceFetchAssessment | null> {
  const validSourceId = idSchema.parse(sourceId);
  const validCheckedAt =
    sourceFetchRecordSchema.shape.checkedAt.parse(checkedAt);
  const previous = await repository.findById(validSourceId);
  if (!previous) return null;

  if (!result.ok) {
    const source = await repository.recordFetchFailure(
      validSourceId,
      validCheckedAt,
    );
    if (!source) return null;
    return {
      source,
      outcome: "failed",
      contentChanged: null,
      observedContentHash: null,
      requiresReview:
        source.consecutiveFailures >= SOURCE_FAILURE_REVIEW_THRESHOLD,
    };
  }

  const source = await repository.recordFetchSuccess(
    validSourceId,
    validCheckedAt,
    result.contentHash,
  );
  if (!source) return null;
  const outcome: SourceFetchOutcome =
    previous.lastContentHash === null
      ? "baseline"
      : previous.lastContentHash === result.contentHash
        ? "unchanged"
        : "changed";

  return {
    source,
    outcome,
    contentChanged: outcome === "baseline" ? null : outcome === "changed",
    observedContentHash: result.contentHash,
    requiresReview: false,
  };
}

export function requiresFetchAttention(
  consecutiveFailures: number,
  lastVerifiedAt: string | null,
  now = new Date(),
): boolean {
  if (consecutiveFailures >= SOURCE_FAILURE_REVIEW_THRESHOLD) return true;
  if (!lastVerifiedAt) return true;
  const verifiedAt = new Date(lastVerifiedAt);
  if (Number.isNaN(verifiedAt.getTime())) return true;
  const cutoff = new Date(now);
  const originalDay = cutoff.getUTCDate();
  cutoff.setUTCDate(1);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - SOURCE_STALE_MONTHS);
  const lastDayOfTargetMonth = new Date(
    Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0),
  ).getUTCDate();
  cutoff.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return verifiedAt <= cutoff;
}

import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredAiClient } from "@/server/ai";
import { createRepositories } from "@/server/db";
import type { PageFetchResult } from "@/server/fetch";
import {
  checkCompany,
  finalizeRetryableCompanyFailure,
  RetryableCompanyCheckError,
} from "@/server/workflows/check-company";

import { baseCompanyInput, clearDatabase } from "./test-helpers";

const OLD_HASH = "a".repeat(64);
const NEW_HASH = "b".repeat(64);
const SOURCE_URL = "https://example.com/careers";
const SOURCE_TEXT = [
  "フルリモート勤務が可能です",
  "全職種が対象です",
  "日本全国から勤務できます",
  "出社は不要です",
  "現在採用中です",
].join("。 ");

function success(hash = NEW_HASH): PageFetchResult {
  return {
    ok: true,
    requestedUrl: SOURCE_URL,
    finalUrl: SOURCE_URL,
    httpStatus: 200,
    contentType: "text/html",
    byteLength: SOURCE_TEXT.length,
    redirectCount: 0,
    normalizedText: SOURCE_TEXT,
    contentHash: hash,
  };
}

function aiClient(confidence = 0.94): StructuredAiClient {
  return {
    generate: vi.fn().mockResolvedValue({
      response: JSON.stringify({
        full_remote: true,
        remote_scope: "all",
        work_location_scope: "nationwide",
        work_location_note: null,
        office_required: "no",
        office_note: null,
        recruiting_status: "open",
        confidence,
        evidence: [
          {
            field: "full_remote",
            text: "フルリモート勤務が可能です",
            source_url: SOURCE_URL,
          },
          {
            field: "remote_scope",
            text: "全職種が対象です",
            source_url: SOURCE_URL,
          },
          {
            field: "work_location_scope",
            text: "日本全国から勤務できます",
            source_url: SOURCE_URL,
          },
          {
            field: "office_required",
            text: "出社は不要です",
            source_url: SOURCE_URL,
          },
          {
            field: "recruiting_status",
            text: "現在採用中です",
            source_url: SOURCE_URL,
          },
        ],
      }),
    }),
  };
}

async function setup() {
  const repositories = createRepositories(env.DB);
  const company = await repositories.companies.create(baseCompanyInput);
  const source = await repositories.companySources.create({
    companyId: company.id,
    sourceType: "recruit",
    url: SOURCE_URL,
    lastContentHash: OLD_HASH,
  });
  const check = await repositories.companyChecks.create({
    companyId: company.id,
    status: "failed",
    errorCode: "CHECK_IN_PROGRESS",
  });
  return { repositories, company, source, check };
}

describe("company check pipeline", () => {
  beforeEach(clearDatabase);

  it("stores an AI change as a candidate without updating the company", async () => {
    const { repositories, company, source, check } = await setup();
    const result = await checkCompany(
      env.DB,
      { companyId: company.id, checkId: check.id },
      {
        pageFetcher: vi.fn().mockResolvedValue(success()),
        aiClient: aiClient(),
        now: () => "2026-08-22T05:00:00.000Z",
      },
    );

    expect(result).toEqual({ outcome: "changed", candidateCount: 1 });
    await expect(
      repositories.companies.findById(company.id),
    ).resolves.toMatchObject({
      remoteScope: "partial",
    });
    await expect(
      repositories.companySources.findById(source.id),
    ).resolves.toMatchObject({
      lastContentHash: NEW_HASH,
    });
    await expect(
      repositories.companyChecks.findById(check.id),
    ).resolves.toMatchObject({
      status: "changed",
      aiUsed: true,
      aiConfidence: 0.94,
    });
  });

  it("does not consume a fetch failure until Workflow retries are exhausted", async () => {
    const { repositories, company, source, check } = await setup();
    const failure: PageFetchResult = {
      ok: false,
      code: "TIMEOUT",
      retryable: true,
      detail: "取得がタイムアウトしました",
    };

    let thrown: RetryableCompanyCheckError | null = null;
    try {
      await checkCompany(
        env.DB,
        { companyId: company.id, checkId: check.id },
        {
          pageFetcher: vi.fn().mockResolvedValue(failure),
          aiClient: aiClient(),
        },
      );
    } catch (error) {
      thrown = error as RetryableCompanyCheckError;
    }
    expect(thrown).toBeInstanceOf(RetryableCompanyCheckError);
    await expect(
      repositories.companySources.findById(source.id),
    ).resolves.toMatchObject({
      consecutiveFailures: 0,
    });

    await finalizeRetryableCompanyFailure(env.DB, {
      checkId: check.id,
      failure: thrown!.failure,
    });
    await expect(
      repositories.companySources.findById(source.id),
    ).resolves.toMatchObject({
      consecutiveFailures: 1,
      lastFetchStatus: "failed",
    });
  });

  it("marks the check for review on the third consecutive fetch failure", async () => {
    const { repositories, company, source, check } = await setup();
    await repositories.companies.update(company.id, {
      lastVerifiedAt: "2026-08-01T00:00:00.000Z",
    });
    await repositories.companySources.update(source.id, {
      consecutiveFailures: 2,
    });

    const result = await finalizeRetryableCompanyFailure(
      env.DB,
      {
        checkId: check.id,
        failure: {
          code: "TIMEOUT",
          sourceId: source.id,
          kind: "fetch",
          message: "取得がタイムアウトしました",
        },
      },
      () => "2026-08-22T05:30:00.000Z",
    );

    expect(result).toEqual({ outcome: "needs_review", candidateCount: 0 });
    await expect(
      repositories.companyChecks.findById(check.id),
    ).resolves.toMatchObject({
      status: "needs_review",
    });
  });

  it("keeps the old baseline when AI is uncertain", async () => {
    const { repositories, company, source, check } = await setup();
    const result = await checkCompany(
      env.DB,
      { companyId: company.id, checkId: check.id },
      {
        pageFetcher: vi.fn().mockResolvedValue(success()),
        aiClient: aiClient(0.2),
      },
    );

    expect(result).toEqual({ outcome: "needs_review", candidateCount: 0 });
    await expect(
      repositories.companySources.findById(source.id),
    ).resolves.toMatchObject({
      lastContentHash: OLD_HASH,
    });
    await expect(
      repositories.companyChecks.findById(check.id),
    ).resolves.toMatchObject({
      status: "needs_review",
      errorCode: "AI_UNCERTAIN",
    });
  });

  it("updates verification timestamps only when all sources are unchanged", async () => {
    const { repositories, company, check } = await setup();
    const verifiedAt = "2026-08-22T06:00:00.000Z";
    const result = await checkCompany(
      env.DB,
      { companyId: company.id, checkId: check.id },
      {
        pageFetcher: vi.fn().mockResolvedValue(success(OLD_HASH)),
        aiClient: aiClient(),
        now: () => verifiedAt,
      },
    );

    expect(result).toEqual({ outcome: "unchanged", candidateCount: 0 });
    await expect(
      repositories.companies.findById(company.id),
    ).resolves.toMatchObject({
      lastVerifiedAt: verifiedAt,
      remoteVerifiedAt: verifiedAt,
      recruitingVerifiedAt: verifiedAt,
    });
  });
});

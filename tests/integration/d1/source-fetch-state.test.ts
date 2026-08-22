import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { createRepositories } from "@/server/db";
import { recordSourceFetchResult } from "@/server/fetch/source-fetch-state";
import type { PageFetchResult } from "@/server/fetch/types";

import { baseCompanyInput, clearDatabase } from "./test-helpers";

const FIRST_HASH = "a".repeat(64);
const SECOND_HASH = "b".repeat(64);

function success(contentHash: string): PageFetchResult {
  return {
    ok: true,
    requestedUrl: "https://example.com/careers",
    finalUrl: "https://example.com/careers",
    httpStatus: 200,
    contentType: "text/html",
    byteLength: 100,
    redirectCount: 0,
    normalizedText: "架空企業の採用情報",
    contentHash,
  };
}

const failed: PageFetchResult = {
  ok: false,
  code: "TIMEOUT",
  retryable: true,
  detail: "取得がタイムアウトしました",
};

describe("D1 source fetch state", () => {
  beforeEach(clearDatabase);

  it("stores a first baseline and preserves it when content changes", async () => {
    const repositories = createRepositories(env.DB);
    const company = await repositories.companies.create(baseCompanyInput);
    const source = await repositories.companySources.create({
      companyId: company.id,
      sourceType: "recruit",
      url: "https://example.com/careers",
    });

    const baseline = await recordSourceFetchResult(
      repositories.companySources,
      source.id,
      success(FIRST_HASH),
      "2026-08-20T01:00:00.000Z",
    );
    expect(baseline).toMatchObject({
      outcome: "baseline",
      contentChanged: null,
      source: {
        lastContentHash: FIRST_HASH,
        lastFetchStatus: "success",
        consecutiveFailures: 0,
      },
    });

    const changed = await recordSourceFetchResult(
      repositories.companySources,
      source.id,
      success(SECOND_HASH),
      "2026-08-20T02:00:00.000Z",
    );
    expect(changed).toMatchObject({
      outcome: "changed",
      contentChanged: true,
      observedContentHash: SECOND_HASH,
      source: { lastContentHash: FIRST_HASH },
    });
    await expect(
      repositories.companies.findById(company.id),
    ).resolves.toMatchObject({
      publicationStatus: "published",
      lastVerifiedAt: null,
    });
  });

  it("increments failures atomically and resets them after success", async () => {
    const repositories = createRepositories(env.DB);
    const company = await repositories.companies.create(baseCompanyInput);
    const source = await repositories.companySources.create({
      companyId: company.id,
      sourceType: "official",
      url: "https://example.com",
    });

    let assessment = await recordSourceFetchResult(
      repositories.companySources,
      source.id,
      failed,
      "2026-08-20T01:00:00.000Z",
    );
    assessment = await recordSourceFetchResult(
      repositories.companySources,
      source.id,
      failed,
      "2026-08-20T02:00:00.000Z",
    );
    assessment = await recordSourceFetchResult(
      repositories.companySources,
      source.id,
      failed,
      "2026-08-20T03:00:00.000Z",
    );
    expect(assessment).toMatchObject({
      requiresReview: true,
      source: { consecutiveFailures: 3, lastFetchStatus: "failed" },
    });
    await expect(
      repositories.companies.findById(company.id),
    ).resolves.toMatchObject({
      publicationStatus: "published",
      lastVerifiedAt: null,
    });

    const recovered = await recordSourceFetchResult(
      repositories.companySources,
      source.id,
      success(FIRST_HASH),
      "2026-08-20T04:00:00.000Z",
    );
    expect(recovered).toMatchObject({
      outcome: "baseline",
      requiresReview: false,
      source: { consecutiveFailures: 0, lastFetchStatus: "success" },
    });
  });
});

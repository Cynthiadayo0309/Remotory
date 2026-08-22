import { describe, expect, it } from "vitest";

import {
  recordSourceFetchResult,
  requiresFetchAttention,
  type SourceFetchStateRepository,
} from "@/server/fetch/source-fetch-state";
import type { PageFetchResult } from "@/server/fetch/types";
import type { CompanySource } from "@/types/company";

const SOURCE_ID = "00000000-0000-4000-8000-000000000001";
const HASH = "a".repeat(64);

function success(contentHash = HASH): PageFetchResult {
  return {
    ok: true,
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    httpStatus: 200,
    contentType: "text/html",
    byteLength: 10,
    redirectCount: 0,
    normalizedText: "example",
    contentHash,
  };
}

function repository(initialHash: string | null = null) {
  let source: CompanySource = {
    id: SOURCE_ID,
    companyId: "00000000-0000-4000-8000-000000000002",
    sourceType: "official",
    url: "https://example.com",
    isActive: true,
    lastCheckedAt: null,
    lastContentHash: initialHash,
    lastFetchStatus: null,
    consecutiveFailures: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const stateRepository: SourceFetchStateRepository = {
    findById: async () => source,
    recordFetchSuccess: async (_, checkedAt, observedHash) => {
      source = {
        ...source,
        lastCheckedAt: checkedAt,
        lastContentHash: source.lastContentHash ?? observedHash,
        lastFetchStatus: "success",
        consecutiveFailures: 0,
      };
      return source;
    },
    recordFetchFailure: async (_, checkedAt) => {
      source = {
        ...source,
        lastCheckedAt: checkedAt,
        lastFetchStatus: "failed",
        consecutiveFailures: source.consecutiveFailures + 1,
      };
      return source;
    },
  };
  return stateRepository;
}

describe("source fetch state", () => {
  it("creates a baseline on first success", async () => {
    const result = await recordSourceFetchResult(
      repository(),
      SOURCE_ID,
      success(),
      "2026-08-20T00:00:00.000Z",
    );
    expect(result).toMatchObject({
      outcome: "baseline",
      contentChanged: null,
      source: { lastContentHash: HASH },
    });
  });

  it("detects unchanged and changed content without replacing the baseline", async () => {
    const unchanged = await recordSourceFetchResult(
      repository(HASH),
      SOURCE_ID,
      success(HASH),
    );
    expect(unchanged).toMatchObject({
      outcome: "unchanged",
      contentChanged: false,
    });

    const changedHash = "b".repeat(64);
    const changed = await recordSourceFetchResult(
      repository(HASH),
      SOURCE_ID,
      success(changedHash),
    );
    expect(changed).toMatchObject({
      outcome: "changed",
      contentChanged: true,
      observedContentHash: changedHash,
      source: { lastContentHash: HASH },
    });
  });

  it("marks three consecutive failures for review", async () => {
    const stateRepository = repository(HASH);
    const failed: PageFetchResult = {
      ok: false,
      code: "TIMEOUT",
      retryable: true,
      detail: "timeout",
    };
    let result = await recordSourceFetchResult(
      stateRepository,
      SOURCE_ID,
      failed,
    );
    result = await recordSourceFetchResult(stateRepository, SOURCE_ID, failed);
    result = await recordSourceFetchResult(stateRepository, SOURCE_ID, failed);
    expect(result).toMatchObject({
      outcome: "failed",
      requiresReview: true,
      source: { consecutiveFailures: 3 },
    });
  });

  it("requires attention after six months without verification", () => {
    const now = new Date("2026-08-20T00:00:00.000Z");
    expect(requiresFetchAttention(0, "2026-02-20T00:00:01.000Z", now)).toBe(
      false,
    );
    expect(requiresFetchAttention(0, "2026-02-20T00:00:00.000Z", now)).toBe(
      true,
    );
    expect(requiresFetchAttention(3, "2026-08-19T00:00:00.000Z", now)).toBe(
      true,
    );
    expect(requiresFetchAttention(0, null, now)).toBe(true);
    const monthEnd = new Date("2026-08-31T00:00:00.000Z");
    expect(
      requiresFetchAttention(0, "2026-02-28T00:00:00.000Z", monthEnd),
    ).toBe(true);
    expect(
      requiresFetchAttention(0, "2026-03-01T00:00:00.000Z", monthEnd),
    ).toBe(false);
  });
});

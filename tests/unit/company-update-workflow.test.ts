import { describe, expect, it, vi } from "vitest";

import {
  parseRetryableCheckFailure,
  RetryableCompanyCheckError,
} from "@/server/workflows/check-company";
import {
  COMPANY_CHECK_STEP_CONFIG,
  COMPANY_UPDATE_BATCH_SIZE,
  COMPANY_UPDATE_FREE_STEP_LIMIT,
  COMPANY_UPDATE_MAX_STEPS_PER_PART,
} from "@/server/workflows/constants";
import {
  decideCompanyUpdatePartState,
  ensureCompanyUpdateContinuation,
  getCompanyUpdateContinuationId,
  type CompanyUpdateContinuationBinding,
} from "@/server/workflows/continuation";

function createWorkflowBinding(
  status: "unknown" | "queued" | "running" | "complete" | "errored" = "unknown",
) {
  const create = vi.fn<CompanyUpdateContinuationBinding["create"]>();
  const binding: CompanyUpdateContinuationBinding = {
    get: vi.fn(async () => ({ status: async () => ({ status }) })),
    create,
  };
  return { binding, create };
}

describe("company update Workflow policy", () => {
  it("uses one initial attempt and at most two retries", () => {
    expect(COMPANY_CHECK_STEP_CONFIG).toEqual({
      retries: {
        limit: 3,
        delay: "10 seconds",
        backoff: "exponential",
      },
      timeout: "2 minutes",
    });
  });

  it("preserves only typed safe retry metadata", () => {
    const error = new RetryableCompanyCheckError({
      code: "TIMEOUT",
      sourceId: "00000000-0000-4000-8000-000000000001",
      kind: "fetch",
      message: "取得がタイムアウトしました",
    });
    expect(parseRetryableCheckFailure(error)).toEqual(error.failure);
    expect(
      parseRetryableCheckFailure(new Error("upstream secret details")),
    ).toEqual({
      code: "WORKFLOW_STEP_FAILED",
      sourceId: null,
      kind: "internal",
      message: "企業の確認処理に失敗しました",
    });
  });

  it("keeps a 250-company part below the Workers Free step limit", () => {
    expect(COMPANY_UPDATE_BATCH_SIZE).toBe(250);
    expect(COMPANY_UPDATE_MAX_STEPS_PER_PART).toBe(755);
    expect(COMPANY_UPDATE_MAX_STEPS_PER_PART).toBeLessThan(
      COMPANY_UPDATE_FREE_STEP_LIMIT,
    );
  });

  it("uses a deterministic continuation instance id", () => {
    expect(
      getCompanyUpdateContinuationId("00000000-0000-4000-8000-000000000001", 2),
    ).toBe("00000000-0000-4000-8000-000000000001-part-2");
  });

  it("creates the next part only when its status is unknown", async () => {
    const { binding, create } = createWorkflowBinding();
    const input = {
      runId: "00000000-0000-4000-8000-000000000001",
      part: 2,
    };

    await expect(
      ensureCompanyUpdateContinuation(binding, input),
    ).resolves.toEqual({
      id: `${input.runId}-part-2`,
      created: true,
      status: "queued",
    });
    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith({
      id: `${input.runId}-part-2`,
      params: input,
    });
  });

  it.each(["queued", "running", "complete"] as const)(
    "does not duplicate a %s continuation after resume",
    async (status) => {
      const { binding, create } = createWorkflowBinding(status);

      await expect(
        ensureCompanyUpdateContinuation(binding, {
          runId: "00000000-0000-4000-8000-000000000001",
          part: 2,
        }),
      ).resolves.toMatchObject({ created: false, status });
      expect(create).not.toHaveBeenCalled();
    },
  );

  it("rejects an unusable continuation and creation failure", async () => {
    const terminal = createWorkflowBinding("errored");
    await expect(
      ensureCompanyUpdateContinuation(terminal.binding, {
        runId: "00000000-0000-4000-8000-000000000001",
        part: 2,
      }),
    ).rejects.toThrow("continuation is unavailable");

    const failedCreate = createWorkflowBinding();
    failedCreate.create.mockRejectedValueOnce(new Error("provider details"));
    await expect(
      ensureCompanyUpdateContinuation(failedCreate.binding, {
        runId: "00000000-0000-4000-8000-000000000001",
        part: 2,
      }),
    ).rejects.toThrow("provider details");
  });

  it("continues while targets remain and completes only at full progress", () => {
    expect(
      decideCompanyUpdatePartState(
        { processedCompanies: 250, totalCompanies: 251 },
        1,
      ),
    ).toEqual({ action: "continue", pendingCompanies: 1 });
    expect(
      decideCompanyUpdatePartState(
        { processedCompanies: 251, totalCompanies: 251 },
        0,
      ),
    ).toEqual({ action: "complete", pendingCompanies: 0 });
    expect(() =>
      decideCompanyUpdatePartState(
        { processedCompanies: 250, totalCompanies: 251 },
        0,
      ),
    ).toThrow("progress is inconsistent");
  });
});

import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { createRepositories } from "@/server/db";

import { baseCompanyInput, clearDatabase } from "./test-helpers";

describe("company update runs", () => {
  beforeEach(clearDatabase);

  it("snapshots published companies and records check progress idempotently", async () => {
    const repositories = createRepositories(env.DB);
    const published = await repositories.companies.create(baseCompanyInput);
    await repositories.companies.create({
      ...baseCompanyInput,
      slug: "hidden-company",
      name: "非公開テスト株式会社",
      publicationStatus: "hidden",
    });
    const runId = crypto.randomUUID();
    const run =
      await repositories.companyUpdateRuns.createForPublishedCompanies({
        id: runId,
        workflowInstanceId: runId,
      });

    expect(run).toMatchObject({ status: "queued", totalCompanies: 1 });
    await expect(
      repositories.companyUpdateRuns.listPendingTargetCompanyIds(run.id, 250),
    ).resolves.toEqual([published.id]);

    await repositories.companyUpdateRuns.markRunning(
      run.id,
      "2026-08-22T04:00:00.000Z",
    );
    const checkId = await repositories.companyUpdateRuns.prepareCheck(
      run.id,
      published.id,
      "2026-08-22T04:00:00.000Z",
    );
    const preparedAgain = await repositories.companyUpdateRuns.prepareCheck(
      run.id,
      published.id,
      "2026-08-22T04:01:00.000Z",
    );
    expect(preparedAgain).toBe(checkId);

    await repositories.companyUpdateRuns.recordProgress(run.id, checkId, {
      outcome: "changed",
      candidateCount: 2,
    });
    const progressed = await repositories.companyUpdateRuns.recordProgress(
      run.id,
      checkId,
      { outcome: "changed", candidateCount: 2 },
    );
    expect(progressed).toMatchObject({
      processedCompanies: 1,
      changedCompanies: 1,
      candidateCount: 2,
    });
    await expect(
      repositories.companyUpdateRuns.countPendingTargets(run.id),
    ).resolves.toBe(0);

    const completed = await repositories.companyUpdateRuns.markCompleted(
      run.id,
      "2026-08-22T04:10:00.000Z",
    );
    expect(completed).toMatchObject({
      status: "completed",
      processedCompanies: 1,
    });
  });

  it("allows only one queued or running run", async () => {
    const repositories = createRepositories(env.DB);
    const firstId = crypto.randomUUID();
    await repositories.companyUpdateRuns.create({
      id: firstId,
      workflowInstanceId: firstId,
      totalCompanies: 0,
    });

    const secondId = crypto.randomUUID();
    await expect(
      repositories.companyUpdateRuns.create({
        id: secondId,
        workflowInstanceId: secondId,
        totalCompanies: 0,
      }),
    ).rejects.toThrow(/UNIQUE constraint failed/);
  });

  it("returns at most 250 unprocessed companies for each part", async () => {
    await env.DB.prepare(
      `WITH RECURSIVE sequence(number) AS (
         SELECT 1
         UNION ALL
         SELECT number + 1 FROM sequence WHERE number < 251
       )
       INSERT INTO companies (
         id, slug, name, remote_scope, work_location_scope,
         office_required, recruiting_status, publication_status,
         created_at, updated_at
       )
       SELECT
         printf('00000000-0000-4000-8000-%012d', number),
         printf('batch-company-%03d', number),
         printf('架空企業%03d', number),
         'unknown', 'unknown', 'unknown', 'unknown', 'published',
         '2026-08-22T04:00:00.000Z', '2026-08-22T04:00:00.000Z'
       FROM sequence`,
    ).run();

    const repositories = createRepositories(env.DB);
    const runId = crypto.randomUUID();
    const run =
      await repositories.companyUpdateRuns.createForPublishedCompanies({
        id: runId,
        workflowInstanceId: runId,
      });
    const firstPart =
      await repositories.companyUpdateRuns.listPendingTargetCompanyIds(
        run.id,
        250,
      );

    expect(run.totalCompanies).toBe(251);
    expect(firstPart).toHaveLength(250);
    await expect(
      repositories.companyUpdateRuns.countPendingTargets(run.id),
    ).resolves.toBe(251);

    await repositories.companyUpdateRuns.markRunning(
      run.id,
      "2026-08-22T04:00:00.000Z",
    );
    const checkId = await repositories.companyUpdateRuns.prepareCheck(
      run.id,
      firstPart[0],
      "2026-08-22T04:00:00.000Z",
    );
    await repositories.companyUpdateRuns.recordProgress(run.id, checkId, {
      outcome: "failed",
      candidateCount: 0,
    });
    await repositories.companyUpdateRuns.recordProgress(run.id, checkId, {
      outcome: "failed",
      candidateCount: 0,
    });

    const resumedPart =
      await repositories.companyUpdateRuns.listPendingTargetCompanyIds(
        run.id,
        250,
      );
    const progressed = await repositories.companyUpdateRuns.findById(run.id);
    expect(resumedPart).toHaveLength(250);
    expect(resumedPart).not.toContain(firstPart[0]);
    expect(progressed).toMatchObject({
      processedCompanies: 1,
      failedCompanies: 1,
    });
    await expect(
      repositories.companyUpdateRuns.countPendingTargets(run.id),
    ).resolves.toBe(250);
  });

  it("marks a run failed when a continuation cannot be started", async () => {
    const repositories = createRepositories(env.DB);
    const runId = crypto.randomUUID();
    await repositories.companyUpdateRuns.create({
      id: runId,
      workflowInstanceId: runId,
      totalCompanies: 251,
    });
    await repositories.companyUpdateRuns.markRunning(
      runId,
      "2026-08-22T04:00:00.000Z",
    );

    const failed = await repositories.companyUpdateRuns.markFailed(
      runId,
      "一括確認Workflowに失敗しました",
      "2026-08-22T04:10:00.000Z",
    );
    expect(failed).toMatchObject({
      status: "failed",
      errorMessage: "一括確認Workflowに失敗しました",
    });
  });
});

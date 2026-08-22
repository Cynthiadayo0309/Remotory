import { createRepositories } from "@/server/db";
import { getDatabase } from "@/server/db/context";
import { getCompanyUpdateWorkflow } from "@/server/workflows/context";

export type StartCompanyUpdateFailure =
  | { ok: false; reason: "already_running" }
  | { ok: false; reason: "no_published_companies" }
  | { ok: false; reason: "workflow_unavailable" };

export async function startCompanyUpdateRun() {
  const db = getDatabase();
  const repositories = createRepositories(db);
  const active = await repositories.companyUpdateRuns.findActive();
  if (active) {
    return { ok: false, reason: "already_running" } as const;
  }

  const publishedCount = await repositories.companies.count({
    publicationStatus: "published",
  });
  if (publishedCount === 0) {
    return { ok: false, reason: "no_published_companies" } as const;
  }

  const workflow = getCompanyUpdateWorkflow();
  if (!workflow) {
    return { ok: false, reason: "workflow_unavailable" } as const;
  }

  const runId = crypto.randomUUID();
  const run = await repositories.companyUpdateRuns.createForPublishedCompanies({
    id: runId,
    workflowInstanceId: runId,
  });

  if (run.totalCompanies === 0) {
    await repositories.companyUpdateRuns.markRunning(
      run.id,
      new Date().toISOString(),
    );
    await repositories.companyUpdateRuns.markCompleted(
      run.id,
      new Date().toISOString(),
    );
    return { ok: false, reason: "no_published_companies" } as const;
  }

  try {
    await workflow.create({
      id: run.workflowInstanceId,
      params: { runId: run.id, part: 1 },
    });
  } catch {
    await repositories.companyUpdateRuns.markFailed(
      run.id,
      "Workflowを開始できませんでした",
      new Date().toISOString(),
    );
    throw new Error("Company update workflow could not be started");
  }

  return {
    ok: true,
    run: await repositories.companyUpdateRuns.findById(run.id),
  } as const;
}

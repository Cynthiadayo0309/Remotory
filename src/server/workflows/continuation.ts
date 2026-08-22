import type { CompanyUpdateRun } from "@/types/update-run";

type WorkflowInstanceStatus =
  | "queued"
  | "running"
  | "paused"
  | "errored"
  | "terminated"
  | "complete"
  | "waiting"
  | "waitingForPause"
  | "unknown";

export interface CompanyUpdateContinuationBinding {
  get(id: string): Promise<{
    status(): Promise<{ status: WorkflowInstanceStatus }>;
  }>;
  create(options: {
    id: string;
    params: { runId: string; part: number };
  }): Promise<unknown>;
}

export interface CompanyUpdatePartState {
  action: "complete" | "continue";
  pendingCompanies: number;
}

export function getCompanyUpdateContinuationId(
  runId: string,
  part: number,
): string {
  return `${runId}-part-${part}`;
}

export function decideCompanyUpdatePartState(
  run: Pick<CompanyUpdateRun, "processedCompanies" | "totalCompanies">,
  pendingCompanies: number,
): CompanyUpdatePartState {
  if (pendingCompanies > 0) {
    return { action: "continue", pendingCompanies };
  }
  if (run.processedCompanies === run.totalCompanies) {
    return { action: "complete", pendingCompanies: 0 };
  }
  throw new Error("Company update progress is inconsistent");
}

export async function ensureCompanyUpdateContinuation(
  binding: CompanyUpdateContinuationBinding,
  input: { runId: string; part: number },
): Promise<{
  id: string;
  created: boolean;
  status: WorkflowInstanceStatus;
}> {
  const id = getCompanyUpdateContinuationId(input.runId, input.part);
  const instance = await binding.get(id);
  const { status } = await instance.status();

  if (status === "errored" || status === "terminated") {
    throw new Error("Company update continuation is unavailable");
  }
  if (status !== "unknown") {
    return { id, created: false, status };
  }

  await binding.create({ id, params: input });
  return { id, created: true, status: "queued" };
}

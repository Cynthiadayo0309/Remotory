export const companyUpdateRunStatuses = [
  "queued",
  "running",
  "completed",
  "failed",
] as const;

export const companyUpdateOutcomes = [
  "unchanged",
  "changed",
  "needs_review",
  "failed",
] as const;

export type CompanyUpdateRunStatus = (typeof companyUpdateRunStatuses)[number];
export type CompanyUpdateOutcome = (typeof companyUpdateOutcomes)[number];

export interface CompanyUpdateRun {
  id: string;
  workflowInstanceId: string;
  status: CompanyUpdateRunStatus;
  totalCompanies: number;
  processedCompanies: number;
  unchangedCompanies: number;
  changedCompanies: number;
  needsReviewCompanies: number;
  failedCompanies: number;
  candidateCount: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyUpdateProgress {
  outcome: CompanyUpdateOutcome;
  candidateCount: number;
}

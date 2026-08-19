export const remoteScopes = ["all", "partial", "unknown"] as const;
export const workLocationScopes = [
  "nationwide",
  "restricted",
  "unknown",
] as const;
export const officeRequirements = ["yes", "no", "unknown"] as const;
export const recruitingStatuses = ["open", "closed", "unknown"] as const;
export const publicationStatuses = [
  "published",
  "needs_review",
  "hidden",
] as const;
export const sourceTypes = [
  "official",
  "recruit",
  "jobs",
  "workstyle",
  "other",
] as const;
export const fetchStatuses = ["success", "failed"] as const;
export const checkStatuses = [
  "success",
  "changed",
  "failed",
  "needs_review",
] as const;
export const reviewStatuses = ["pending", "approved", "rejected"] as const;
export const changeCandidateFields = [
  "remote_scope",
  "work_location_scope",
  "work_location_note",
  "office_required",
  "office_note",
  "recruiting_status",
] as const;

export type RemoteScope = (typeof remoteScopes)[number];
export type WorkLocationScope = (typeof workLocationScopes)[number];
export type OfficeRequirement = (typeof officeRequirements)[number];
export type RecruitingStatus = (typeof recruitingStatuses)[number];
export type PublicationStatus = (typeof publicationStatuses)[number];
export type SourceType = (typeof sourceTypes)[number];
export type FetchStatus = (typeof fetchStatuses)[number];
export type CheckStatus = (typeof checkStatuses)[number];
export type ReviewStatus = (typeof reviewStatuses)[number];
export type ChangeCandidateField = (typeof changeCandidateFields)[number];

export interface Company {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  officialUrl: string | null;
  recruitUrl: string | null;
  industry: string | null;
  remoteScope: RemoteScope;
  workLocationScope: WorkLocationScope;
  workLocationNote: string | null;
  officeRequired: OfficeRequirement;
  officeNote: string | null;
  recruitingStatus: RecruitingStatus;
  publicationStatus: PublicationStatus;
  lastVerifiedAt: string | null;
  remoteVerifiedAt: string | null;
  recruitingVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySource {
  id: string;
  companyId: string;
  sourceType: SourceType;
  url: string;
  isActive: boolean;
  lastCheckedAt: string | null;
  lastContentHash: string | null;
  lastFetchStatus: FetchStatus | null;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyCheck {
  id: string;
  companyId: string;
  startedAt: string;
  completedAt: string | null;
  status: CheckStatus;
  contentChanged: boolean | null;
  aiUsed: boolean;
  aiConfidence: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface CompanyChangeCandidate {
  id: string;
  companyId: string;
  checkId: string | null;
  fieldName: ChangeCandidateField;
  oldValue: string | null;
  newValue: string | null;
  evidenceText: string | null;
  sourceUrl: string | null;
  confidence: number | null;
  reviewStatus: ReviewStatus;
  reviewedAt: string | null;
  createdAt: string;
}

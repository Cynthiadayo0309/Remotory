import type {
  ChangeCandidateField,
  CheckStatus,
  FetchStatus,
  OfficeRequirement,
  PublicationStatus,
  RecruitingStatus,
  RemoteScope,
  ReviewStatus,
  SourceType,
  WorkLocationScope,
} from "@/types/company";
import type { CompanyUpdateRunStatus } from "@/types/update-run";

export interface CompanyRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  official_url: string | null;
  recruit_url: string | null;
  industry: string | null;
  remote_scope: RemoteScope;
  work_location_scope: WorkLocationScope;
  work_location_note: string | null;
  office_required: OfficeRequirement;
  office_note: string | null;
  recruiting_status: RecruitingStatus;
  publication_status: PublicationStatus;
  last_verified_at: string | null;
  remote_verified_at: string | null;
  recruiting_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanySourceRow {
  id: string;
  company_id: string;
  source_type: SourceType;
  url: string;
  is_active: number;
  last_checked_at: string | null;
  last_content_hash: string | null;
  last_fetch_status: FetchStatus | null;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyCheckRow {
  id: string;
  company_id: string;
  started_at: string;
  completed_at: string | null;
  status: CheckStatus;
  content_changed: number | null;
  ai_used: number;
  ai_confidence: number | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
}

export interface CompanyChangeCandidateRow {
  id: string;
  company_id: string;
  check_id: string | null;
  field_name: ChangeCandidateField;
  old_value: string | null;
  new_value: string | null;
  evidence_text: string | null;
  source_url: string | null;
  confidence: number | null;
  review_status: ReviewStatus;
  reviewed_at: string | null;
  created_at: string;
}

export interface CompanyUpdateRunRow {
  id: string;
  workflow_instance_id: string;
  status: CompanyUpdateRunStatus;
  total_companies: number;
  processed_companies: number;
  unchanged_companies: number;
  changed_companies: number;
  needs_review_companies: number;
  failed_companies: number;
  candidate_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

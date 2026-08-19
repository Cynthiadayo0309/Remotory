import type {
  Company,
  CompanyChangeCandidate,
  CompanyCheck,
  CompanySource,
} from "@/types/company";
import type {
  CompanyChangeCandidateRow,
  CompanyCheckRow,
  CompanyRow,
  CompanySourceRow,
} from "@/server/db/rows";

export function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    officialUrl: row.official_url,
    recruitUrl: row.recruit_url,
    industry: row.industry,
    remoteScope: row.remote_scope,
    workLocationScope: row.work_location_scope,
    workLocationNote: row.work_location_note,
    officeRequired: row.office_required,
    officeNote: row.office_note,
    recruitingStatus: row.recruiting_status,
    publicationStatus: row.publication_status,
    lastVerifiedAt: row.last_verified_at,
    remoteVerifiedAt: row.remote_verified_at,
    recruitingVerifiedAt: row.recruiting_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCompanySource(row: CompanySourceRow): CompanySource {
  return {
    id: row.id,
    companyId: row.company_id,
    sourceType: row.source_type,
    url: row.url,
    isActive: row.is_active === 1,
    lastCheckedAt: row.last_checked_at,
    lastContentHash: row.last_content_hash,
    lastFetchStatus: row.last_fetch_status,
    consecutiveFailures: row.consecutive_failures,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCompanyCheck(row: CompanyCheckRow): CompanyCheck {
  return {
    id: row.id,
    companyId: row.company_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    contentChanged:
      row.content_changed === null ? null : row.content_changed === 1,
    aiUsed: row.ai_used === 1,
    aiConfidence: row.ai_confidence,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

export function mapCompanyChangeCandidate(
  row: CompanyChangeCandidateRow,
): CompanyChangeCandidate {
  return {
    id: row.id,
    companyId: row.company_id,
    checkId: row.check_id,
    fieldName: row.field_name,
    oldValue: row.old_value,
    newValue: row.new_value,
    evidenceText: row.evidence_text,
    sourceUrl: row.source_url,
    confidence: row.confidence,
    reviewStatus: row.review_status,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

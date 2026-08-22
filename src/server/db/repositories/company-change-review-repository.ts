import { mapCompany, mapCompanyChangeCandidate } from "@/server/db/mappers";
import {
  mergeRepositoryDependencies,
  type RepositoryDependencies,
} from "@/server/db/repository-dependencies";
import type { CompanyChangeCandidateRow, CompanyRow } from "@/server/db/rows";
import type {
  ChangeCandidateField,
  Company,
  CompanyChangeCandidate,
} from "@/types/company";
import { createCompanySchema, idSchema } from "@/validation/company";

const CANDIDATE_COLUMNS = `
  id, company_id, check_id, field_name, old_value, new_value,
  evidence_text, source_url, confidence,
  review_status, reviewed_at, created_at
`;

const COMPANY_COLUMNS = `
  id, slug, name, description, official_url, recruit_url, industry,
  remote_scope, work_location_scope, work_location_note,
  office_required, office_note, recruiting_status, publication_status,
  last_verified_at, remote_verified_at, recruiting_verified_at,
  created_at, updated_at
`;

const FIELD_COLUMNS: Record<ChangeCandidateField, string> = {
  remote_scope: "remote_scope",
  work_location_scope: "work_location_scope",
  work_location_note: "work_location_note",
  office_required: "office_required",
  office_note: "office_note",
  recruiting_status: "recruiting_status",
};

export type CandidateReviewFailure =
  "not_found" | "already_reviewed" | "stale_value";

export type CandidateReviewResult =
  | {
      ok: true;
      candidate: CompanyChangeCandidate;
      company: Company;
    }
  | {
      ok: false;
      reason: CandidateReviewFailure;
      candidate: CompanyChangeCandidate | null;
    };

function parseNewValue(
  field: ChangeCandidateField,
  value: string | null,
): string | null {
  switch (field) {
    case "remote_scope":
      return createCompanySchema.shape.remoteScope.parse(value);
    case "work_location_scope":
      return createCompanySchema.shape.workLocationScope.parse(value);
    case "work_location_note":
      return createCompanySchema.shape.workLocationNote.parse(value);
    case "office_required":
      return createCompanySchema.shape.officeRequired.parse(value);
    case "office_note":
      return createCompanySchema.shape.officeNote.parse(value);
    case "recruiting_status":
      return createCompanySchema.shape.recruitingStatus.parse(value);
  }
}

export class CompanyChangeReviewRepository {
  private readonly dependencies: RepositoryDependencies;

  constructor(
    private readonly db: D1Database,
    dependencies?: Partial<RepositoryDependencies>,
  ) {
    this.dependencies = mergeRepositoryDependencies(dependencies);
  }

  private async findCandidate(
    id: string,
  ): Promise<CompanyChangeCandidate | null> {
    const row = await this.db
      .prepare(
        `SELECT ${CANDIDATE_COLUMNS}
         FROM company_change_candidates
         WHERE id = ?1`,
      )
      .bind(id)
      .first<CompanyChangeCandidateRow>();
    return row ? mapCompanyChangeCandidate(row) : null;
  }

  private async findCompany(id: string): Promise<Company | null> {
    const row = await this.db
      .prepare(`SELECT ${COMPANY_COLUMNS} FROM companies WHERE id = ?1`)
      .bind(id)
      .first<CompanyRow>();
    return row ? mapCompany(row) : null;
  }

  private async classifyFailure(id: string): Promise<CandidateReviewResult> {
    const candidate = await this.findCandidate(id);
    if (!candidate) {
      return { ok: false, reason: "not_found", candidate: null };
    }
    if (candidate.reviewStatus !== "pending") {
      return { ok: false, reason: "already_reviewed", candidate };
    }
    return { ok: false, reason: "stale_value", candidate };
  }

  async approve(id: string): Promise<CandidateReviewResult> {
    const validId = idSchema.parse(id);
    const candidate = await this.findCandidate(validId);
    if (!candidate) {
      return { ok: false, reason: "not_found", candidate: null };
    }
    if (candidate.reviewStatus !== "pending") {
      return { ok: false, reason: "already_reviewed", candidate };
    }

    const column = FIELD_COLUMNS[candidate.fieldName];
    const newValue = parseNewValue(candidate.fieldName, candidate.newValue);
    const reviewedAt = this.dependencies.now();
    const results = await this.db.batch([
      this.db
        .prepare(
          `UPDATE company_change_candidates
           SET review_status = 'approved', reviewed_at = ?1
           WHERE id = ?2 AND review_status = 'pending'
             AND EXISTS (
               SELECT 1 FROM companies
               WHERE id = company_change_candidates.company_id
                 AND ${column} IS ?3
             )`,
        )
        .bind(reviewedAt, validId, candidate.oldValue),
      this.db
        .prepare(
          `UPDATE companies
           SET ${column} = ?1, updated_at = ?2
           WHERE id = ?3
             AND EXISTS (
               SELECT 1 FROM company_change_candidates
               WHERE id = ?4
                 AND company_id = companies.id
                 AND review_status = 'approved'
                 AND reviewed_at = ?2
             )`,
        )
        .bind(newValue, reviewedAt, candidate.companyId, validId),
    ]);

    if ((results[0]?.meta.changes ?? 0) !== 1) {
      return this.classifyFailure(validId);
    }
    if ((results[1]?.meta.changes ?? 0) !== 1) {
      throw new Error("Approved candidate did not update its company");
    }

    const [reviewedCandidate, company] = await Promise.all([
      this.findCandidate(validId),
      this.findCompany(candidate.companyId),
    ]);
    if (!reviewedCandidate || !company) {
      throw new Error("Approved candidate result could not be loaded");
    }
    return { ok: true, candidate: reviewedCandidate, company };
  }

  async reject(id: string): Promise<CandidateReviewResult> {
    const validId = idSchema.parse(id);
    const reviewedAt = this.dependencies.now();
    const result = await this.db
      .prepare(
        `UPDATE company_change_candidates
         SET review_status = 'rejected', reviewed_at = ?1
         WHERE id = ?2 AND review_status = 'pending'`,
      )
      .bind(reviewedAt, validId)
      .run();

    if ((result.meta.changes ?? 0) !== 1) {
      return this.classifyFailure(validId);
    }

    const candidate = await this.findCandidate(validId);
    if (!candidate) throw new Error("Rejected candidate could not be loaded");
    const company = await this.findCompany(candidate.companyId);
    if (!company) throw new Error("Candidate company could not be loaded");
    return { ok: true, candidate, company };
  }
}

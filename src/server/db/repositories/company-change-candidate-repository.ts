import { mapCompanyChangeCandidate } from "@/server/db/mappers";
import {
  mergeRepositoryDependencies,
  type D1BindingValue,
  type RepositoryDependencies,
} from "@/server/db/repository-dependencies";
import type { CompanyChangeCandidateRow } from "@/server/db/rows";
import type { CompanyChangeCandidate, ReviewStatus } from "@/types/company";
import {
  createCompanyChangeCandidateSchema,
  idSchema,
  updateCompanyChangeCandidateSchema,
  type CreateCompanyChangeCandidateInput,
  type UpdateCompanyChangeCandidateInput,
} from "@/validation/company";

const CANDIDATE_COLUMNS = `
  id, company_id, check_id, field_name, old_value, new_value,
  evidence_text, source_url, confidence,
  review_status, reviewed_at, created_at
`;

export class CompanyChangeCandidateRepository {
  private readonly dependencies: RepositoryDependencies;

  constructor(
    private readonly db: D1Database,
    dependencies?: Partial<RepositoryDependencies>,
  ) {
    this.dependencies = mergeRepositoryDependencies(dependencies);
  }

  async create(
    input: CreateCompanyChangeCandidateInput,
  ): Promise<CompanyChangeCandidate> {
    const value = createCompanyChangeCandidateSchema.parse(input);
    const id = this.dependencies.generateId();
    const timestamp = this.dependencies.now();

    await this.db
      .prepare(
        `INSERT INTO company_change_candidates (${CANDIDATE_COLUMNS})
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
      )
      .bind(
        id,
        value.companyId,
        value.checkId,
        value.fieldName,
        value.oldValue,
        value.newValue,
        value.evidenceText,
        value.sourceUrl,
        value.confidence,
        value.reviewStatus,
        value.reviewedAt,
        timestamp,
      )
      .run();

    const candidate = await this.findById(id);
    if (!candidate) {
      throw new Error("Created change candidate could not be loaded");
    }
    return candidate;
  }

  async findById(id: string): Promise<CompanyChangeCandidate | null> {
    const validId = idSchema.parse(id);
    const row = await this.db
      .prepare(
        `SELECT ${CANDIDATE_COLUMNS}
         FROM company_change_candidates
         WHERE id = ?1`,
      )
      .bind(validId)
      .first<CompanyChangeCandidateRow>();
    return row ? mapCompanyChangeCandidate(row) : null;
  }

  async listByCompany(companyId: string): Promise<CompanyChangeCandidate[]> {
    const validCompanyId = idSchema.parse(companyId);
    const result = await this.db
      .prepare(
        `SELECT ${CANDIDATE_COLUMNS}
         FROM company_change_candidates
         WHERE company_id = ?1
         ORDER BY created_at DESC, id DESC`,
      )
      .bind(validCompanyId)
      .all<CompanyChangeCandidateRow>();
    return result.results.map(mapCompanyChangeCandidate);
  }

  async listByReviewStatus(
    reviewStatus: ReviewStatus,
  ): Promise<CompanyChangeCandidate[]> {
    const validStatus = createCompanyChangeCandidateSchema.shape.reviewStatus
      .unwrap()
      .parse(reviewStatus);
    const result = await this.db
      .prepare(
        `SELECT ${CANDIDATE_COLUMNS}
         FROM company_change_candidates
         WHERE review_status = ?1
         ORDER BY created_at ASC, id ASC`,
      )
      .bind(validStatus)
      .all<CompanyChangeCandidateRow>();
    return result.results.map(mapCompanyChangeCandidate);
  }

  async update(
    id: string,
    input: UpdateCompanyChangeCandidateInput,
  ): Promise<CompanyChangeCandidate | null> {
    const validId = idSchema.parse(id);
    const value = updateCompanyChangeCandidateSchema.parse(input);
    const assignments: string[] = [];
    const parameters: D1BindingValue[] = [];

    const addAssignment = (column: string, fieldValue: D1BindingValue) => {
      parameters.push(fieldValue);
      assignments.push(`${column} = ?${parameters.length}`);
    };

    if (value.checkId !== undefined) addAssignment("check_id", value.checkId);
    if (value.fieldName !== undefined)
      addAssignment("field_name", value.fieldName);
    if (value.oldValue !== undefined)
      addAssignment("old_value", value.oldValue);
    if (value.newValue !== undefined)
      addAssignment("new_value", value.newValue);
    if (value.evidenceText !== undefined)
      addAssignment("evidence_text", value.evidenceText);
    if (value.sourceUrl !== undefined)
      addAssignment("source_url", value.sourceUrl);
    if (value.confidence !== undefined)
      addAssignment("confidence", value.confidence);
    if (value.reviewStatus !== undefined)
      addAssignment("review_status", value.reviewStatus);
    if (value.reviewedAt !== undefined)
      addAssignment("reviewed_at", value.reviewedAt);

    parameters.push(validId);
    await this.db
      .prepare(
        `UPDATE company_change_candidates
         SET ${assignments.join(", ")}
         WHERE id = ?${parameters.length}`,
      )
      .bind(...parameters)
      .run();

    return this.findById(validId);
  }

  async delete(id: string): Promise<boolean> {
    const validId = idSchema.parse(id);
    const result = await this.db
      .prepare("DELETE FROM company_change_candidates WHERE id = ?1")
      .bind(validId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }
}

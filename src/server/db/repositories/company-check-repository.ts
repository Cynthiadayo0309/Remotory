import { mapCompanyCheck } from "@/server/db/mappers";
import {
  mergeRepositoryDependencies,
  type D1BindingValue,
  type RepositoryDependencies,
} from "@/server/db/repository-dependencies";
import type { CompanyCheckRow } from "@/server/db/rows";
import type { CompanyCheck } from "@/types/company";
import {
  createCompanyCheckSchema,
  idSchema,
  updateCompanyCheckSchema,
  type CreateCompanyCheckInput,
  type UpdateCompanyCheckInput,
} from "@/validation/company";

const CHECK_COLUMNS = `
  id, company_id, started_at, completed_at, status,
  content_changed, ai_used, ai_confidence,
  error_code, error_message, created_at
`;

export class CompanyCheckRepository {
  private readonly dependencies: RepositoryDependencies;

  constructor(
    private readonly db: D1Database,
    dependencies?: Partial<RepositoryDependencies>,
  ) {
    this.dependencies = mergeRepositoryDependencies(dependencies);
  }

  async create(input: CreateCompanyCheckInput): Promise<CompanyCheck> {
    const value = createCompanyCheckSchema.parse(input);
    const id = this.dependencies.generateId();
    const timestamp = this.dependencies.now();

    await this.db
      .prepare(
        `INSERT INTO company_checks (${CHECK_COLUMNS})
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
      )
      .bind(
        id,
        value.companyId,
        value.startedAt ?? timestamp,
        value.completedAt,
        value.status,
        value.contentChanged === null ? null : value.contentChanged ? 1 : 0,
        value.aiUsed ? 1 : 0,
        value.aiConfidence,
        value.errorCode,
        value.errorMessage,
        timestamp,
      )
      .run();

    const check = await this.findById(id);
    if (!check) {
      throw new Error("Created company check could not be loaded");
    }
    return check;
  }

  async findById(id: string): Promise<CompanyCheck | null> {
    const validId = idSchema.parse(id);
    const row = await this.db
      .prepare(`SELECT ${CHECK_COLUMNS} FROM company_checks WHERE id = ?1`)
      .bind(validId)
      .first<CompanyCheckRow>();
    return row ? mapCompanyCheck(row) : null;
  }

  async listByCompany(companyId: string): Promise<CompanyCheck[]> {
    const validCompanyId = idSchema.parse(companyId);
    const result = await this.db
      .prepare(
        `SELECT ${CHECK_COLUMNS}
         FROM company_checks
         WHERE company_id = ?1
         ORDER BY created_at DESC, id DESC`,
      )
      .bind(validCompanyId)
      .all<CompanyCheckRow>();
    return result.results.map(mapCompanyCheck);
  }

  async update(
    id: string,
    input: UpdateCompanyCheckInput,
  ): Promise<CompanyCheck | null> {
    const validId = idSchema.parse(id);
    const value = updateCompanyCheckSchema.parse(input);
    const assignments: string[] = [];
    const parameters: D1BindingValue[] = [];

    const addAssignment = (column: string, fieldValue: D1BindingValue) => {
      parameters.push(fieldValue);
      assignments.push(`${column} = ?${parameters.length}`);
    };

    if (value.completedAt !== undefined)
      addAssignment("completed_at", value.completedAt);
    if (value.status !== undefined) addAssignment("status", value.status);
    if (value.contentChanged !== undefined) {
      addAssignment(
        "content_changed",
        value.contentChanged === null ? null : value.contentChanged ? 1 : 0,
      );
    }
    if (value.aiUsed !== undefined)
      addAssignment("ai_used", value.aiUsed ? 1 : 0);
    if (value.aiConfidence !== undefined)
      addAssignment("ai_confidence", value.aiConfidence);
    if (value.errorCode !== undefined)
      addAssignment("error_code", value.errorCode);
    if (value.errorMessage !== undefined)
      addAssignment("error_message", value.errorMessage);

    parameters.push(validId);
    await this.db
      .prepare(
        `UPDATE company_checks
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
      .prepare("DELETE FROM company_checks WHERE id = ?1")
      .bind(validId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }
}

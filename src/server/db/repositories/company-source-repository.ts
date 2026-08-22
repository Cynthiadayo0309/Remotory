import { mapCompanySource } from "@/server/db/mappers";
import {
  mergeRepositoryDependencies,
  type D1BindingValue,
  type RepositoryDependencies,
} from "@/server/db/repository-dependencies";
import type { CompanySourceRow } from "@/server/db/rows";
import type { CompanySource } from "@/types/company";
import {
  createCompanySourceSchema,
  idSchema,
  sourceFetchRecordSchema,
  updateCompanySourceSchema,
  type CreateCompanySourceInput,
  type UpdateCompanySourceInput,
} from "@/validation/company";

const SOURCE_COLUMNS = `
  id, company_id, source_type, url, is_active,
  last_checked_at, last_content_hash, last_fetch_status,
  consecutive_failures, created_at, updated_at
`;

export class CompanySourceRepository {
  private readonly dependencies: RepositoryDependencies;

  constructor(
    private readonly db: D1Database,
    dependencies?: Partial<RepositoryDependencies>,
  ) {
    this.dependencies = mergeRepositoryDependencies(dependencies);
  }

  async create(input: CreateCompanySourceInput): Promise<CompanySource> {
    const value = createCompanySourceSchema.parse(input);
    const id = this.dependencies.generateId();
    const timestamp = this.dependencies.now();

    await this.db
      .prepare(
        `INSERT INTO company_sources (${SOURCE_COLUMNS})
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
      )
      .bind(
        id,
        value.companyId,
        value.sourceType,
        value.url,
        value.isActive ? 1 : 0,
        value.lastCheckedAt,
        value.lastContentHash,
        value.lastFetchStatus,
        value.consecutiveFailures,
        timestamp,
        timestamp,
      )
      .run();

    const source = await this.findById(id);
    if (!source) {
      throw new Error("Created company source could not be loaded");
    }
    return source;
  }

  async findById(id: string): Promise<CompanySource | null> {
    const validId = idSchema.parse(id);
    const row = await this.db
      .prepare(`SELECT ${SOURCE_COLUMNS} FROM company_sources WHERE id = ?1`)
      .bind(validId)
      .first<CompanySourceRow>();
    return row ? mapCompanySource(row) : null;
  }

  async listByCompany(companyId: string): Promise<CompanySource[]> {
    const validCompanyId = idSchema.parse(companyId);
    const result = await this.db
      .prepare(
        `SELECT ${SOURCE_COLUMNS}
         FROM company_sources
         WHERE company_id = ?1
         ORDER BY created_at ASC, id ASC`,
      )
      .bind(validCompanyId)
      .all<CompanySourceRow>();
    return result.results.map(mapCompanySource);
  }

  async listActiveByCompany(companyId: string): Promise<CompanySource[]> {
    const validCompanyId = idSchema.parse(companyId);
    const result = await this.db
      .prepare(
        `SELECT ${SOURCE_COLUMNS}
         FROM company_sources
         WHERE company_id = ?1 AND is_active = 1
         ORDER BY created_at ASC, id ASC`,
      )
      .bind(validCompanyId)
      .all<CompanySourceRow>();
    return result.results.map(mapCompanySource);
  }

  async recordFetchSuccess(
    id: string,
    checkedAt: string,
    observedContentHash: string,
  ): Promise<CompanySource | null> {
    const validId = idSchema.parse(id);
    const value = sourceFetchRecordSchema.parse({
      checkedAt,
      observedContentHash,
    });
    await this.db
      .prepare(
        `UPDATE company_sources
         SET last_checked_at = ?1,
             last_content_hash = COALESCE(last_content_hash, ?2),
             last_fetch_status = 'success',
             consecutive_failures = 0,
             updated_at = ?3
         WHERE id = ?4`,
      )
      .bind(
        value.checkedAt,
        value.observedContentHash,
        this.dependencies.now(),
        validId,
      )
      .run();
    return this.findById(validId);
  }

  async recordFetchFailure(
    id: string,
    checkedAt: string,
  ): Promise<CompanySource | null> {
    const validId = idSchema.parse(id);
    const validCheckedAt =
      sourceFetchRecordSchema.shape.checkedAt.parse(checkedAt);
    await this.db
      .prepare(
        `UPDATE company_sources
         SET last_checked_at = ?1,
             last_fetch_status = 'failed',
             consecutive_failures = consecutive_failures + 1,
             updated_at = ?2
         WHERE id = ?3`,
      )
      .bind(validCheckedAt, this.dependencies.now(), validId)
      .run();
    return this.findById(validId);
  }

  async commitContentHash(
    id: string,
    observedContentHash: string,
  ): Promise<CompanySource | null> {
    const validId = idSchema.parse(id);
    const validHash =
      sourceFetchRecordSchema.shape.observedContentHash.parse(
        observedContentHash,
      );
    await this.db
      .prepare(
        `UPDATE company_sources
         SET last_content_hash = ?1, updated_at = ?2
         WHERE id = ?3`,
      )
      .bind(validHash, this.dependencies.now(), validId)
      .run();
    return this.findById(validId);
  }

  async update(
    id: string,
    input: UpdateCompanySourceInput,
  ): Promise<CompanySource | null> {
    const validId = idSchema.parse(id);
    const value = updateCompanySourceSchema.parse(input);
    const assignments: string[] = [];
    const parameters: D1BindingValue[] = [];

    const addAssignment = (column: string, fieldValue: D1BindingValue) => {
      parameters.push(fieldValue);
      assignments.push(`${column} = ?${parameters.length}`);
    };

    if (value.sourceType !== undefined)
      addAssignment("source_type", value.sourceType);
    if (value.url !== undefined) addAssignment("url", value.url);
    if (value.isActive !== undefined)
      addAssignment("is_active", value.isActive ? 1 : 0);
    if (value.lastCheckedAt !== undefined)
      addAssignment("last_checked_at", value.lastCheckedAt);
    if (value.lastContentHash !== undefined)
      addAssignment("last_content_hash", value.lastContentHash);
    if (value.lastFetchStatus !== undefined)
      addAssignment("last_fetch_status", value.lastFetchStatus);
    if (value.consecutiveFailures !== undefined)
      addAssignment("consecutive_failures", value.consecutiveFailures);

    addAssignment("updated_at", this.dependencies.now());
    parameters.push(validId);

    await this.db
      .prepare(
        `UPDATE company_sources
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
      .prepare("DELETE FROM company_sources WHERE id = ?1")
      .bind(validId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }
}

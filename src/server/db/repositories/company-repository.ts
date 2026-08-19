import {
  companyListFiltersSchema,
  createCompanySchema,
  idSchema,
  updateCompanySchema,
  type CompanyListFilters,
  type CreateCompanyInput,
  type UpdateCompanyInput,
} from "@/validation/company";
import type { Company } from "@/types/company";
import { mapCompany } from "@/server/db/mappers";
import {
  mergeRepositoryDependencies,
  type D1BindingValue,
  type RepositoryDependencies,
} from "@/server/db/repository-dependencies";
import type { CompanyRow } from "@/server/db/rows";

const COMPANY_COLUMNS = `
  id, slug, name, description, official_url, recruit_url, industry,
  remote_scope, work_location_scope, work_location_note,
  office_required, office_note, recruiting_status, publication_status,
  last_verified_at, remote_verified_at, recruiting_verified_at,
  created_at, updated_at
`;

export class CompanyRepository {
  private readonly dependencies: RepositoryDependencies;

  constructor(
    private readonly db: D1Database,
    dependencies?: Partial<RepositoryDependencies>,
  ) {
    this.dependencies = mergeRepositoryDependencies(dependencies);
  }

  async create(input: CreateCompanyInput): Promise<Company> {
    const value = createCompanySchema.parse(input);
    const id = this.dependencies.generateId();
    const timestamp = this.dependencies.now();

    await this.db
      .prepare(
        `INSERT INTO companies (${COMPANY_COLUMNS})
         VALUES (
           ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
           ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19
         )`,
      )
      .bind(
        id,
        value.slug,
        value.name,
        value.description,
        value.officialUrl,
        value.recruitUrl,
        value.industry,
        value.remoteScope,
        value.workLocationScope,
        value.workLocationNote,
        value.officeRequired,
        value.officeNote,
        value.recruitingStatus,
        value.publicationStatus,
        value.lastVerifiedAt,
        value.remoteVerifiedAt,
        value.recruitingVerifiedAt,
        timestamp,
        timestamp,
      )
      .run();

    const company = await this.findById(id);
    if (!company) {
      throw new Error("Created company could not be loaded");
    }
    return company;
  }

  async findById(id: string): Promise<Company | null> {
    const validId = idSchema.parse(id);
    const row = await this.db
      .prepare(`SELECT ${COMPANY_COLUMNS} FROM companies WHERE id = ?1`)
      .bind(validId)
      .first<CompanyRow>();
    return row ? mapCompany(row) : null;
  }

  async findBySlug(slug: string): Promise<Company | null> {
    const validSlug = createCompanySchema.shape.slug.parse(slug);
    const row = await this.db
      .prepare(`SELECT ${COMPANY_COLUMNS} FROM companies WHERE slug = ?1`)
      .bind(validSlug)
      .first<CompanyRow>();
    return row ? mapCompany(row) : null;
  }

  async list(filters: CompanyListFilters = {}): Promise<Company[]> {
    const value = companyListFiltersSchema.parse(filters);
    const conditions: string[] = [];
    const parameters: D1BindingValue[] = [];

    const addCondition = (sql: string, parameter: D1BindingValue) => {
      parameters.push(parameter);
      conditions.push(sql.replace("?", `?${parameters.length}`));
    };

    if (value.keyword) {
      const keyword = `%${value.keyword}%`;
      parameters.push(keyword, keyword, keyword);
      const start = parameters.length - 2;
      conditions.push(
        `(name LIKE ?${start} OR description LIKE ?${start + 1} OR industry LIKE ?${start + 2})`,
      );
    }
    if (value.publicationStatus) {
      addCondition("publication_status = ?", value.publicationStatus);
    }
    if (value.recruitingStatus) {
      addCondition("recruiting_status = ?", value.recruitingStatus);
    }
    if (value.workLocationScope) {
      addCondition("work_location_scope = ?", value.workLocationScope);
    }
    if (value.industry) {
      addCondition("industry = ?", value.industry);
    }

    parameters.push(value.limit, value.offset);
    const limitIndex = parameters.length - 1;
    const offsetIndex = parameters.length;
    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.db
      .prepare(
        `SELECT ${COMPANY_COLUMNS}
         FROM companies
         ${where}
         ORDER BY name ASC, id ASC
         LIMIT ?${limitIndex} OFFSET ?${offsetIndex}`,
      )
      .bind(...parameters)
      .all<CompanyRow>();

    return result.results.map(mapCompany);
  }

  async update(id: string, input: UpdateCompanyInput): Promise<Company | null> {
    const validId = idSchema.parse(id);
    const value = updateCompanySchema.parse(input);
    const assignments: string[] = [];
    const parameters: D1BindingValue[] = [];

    const addAssignment = (column: string, fieldValue: D1BindingValue) => {
      parameters.push(fieldValue);
      assignments.push(`${column} = ?${parameters.length}`);
    };

    if (value.slug !== undefined) addAssignment("slug", value.slug);
    if (value.name !== undefined) addAssignment("name", value.name);
    if (value.description !== undefined)
      addAssignment("description", value.description);
    if (value.officialUrl !== undefined)
      addAssignment("official_url", value.officialUrl);
    if (value.recruitUrl !== undefined)
      addAssignment("recruit_url", value.recruitUrl);
    if (value.industry !== undefined) addAssignment("industry", value.industry);
    if (value.remoteScope !== undefined)
      addAssignment("remote_scope", value.remoteScope);
    if (value.workLocationScope !== undefined)
      addAssignment("work_location_scope", value.workLocationScope);
    if (value.workLocationNote !== undefined)
      addAssignment("work_location_note", value.workLocationNote);
    if (value.officeRequired !== undefined)
      addAssignment("office_required", value.officeRequired);
    if (value.officeNote !== undefined)
      addAssignment("office_note", value.officeNote);
    if (value.recruitingStatus !== undefined)
      addAssignment("recruiting_status", value.recruitingStatus);
    if (value.publicationStatus !== undefined)
      addAssignment("publication_status", value.publicationStatus);
    if (value.lastVerifiedAt !== undefined)
      addAssignment("last_verified_at", value.lastVerifiedAt);
    if (value.remoteVerifiedAt !== undefined)
      addAssignment("remote_verified_at", value.remoteVerifiedAt);
    if (value.recruitingVerifiedAt !== undefined)
      addAssignment("recruiting_verified_at", value.recruitingVerifiedAt);

    addAssignment("updated_at", this.dependencies.now());
    parameters.push(validId);

    await this.db
      .prepare(
        `UPDATE companies
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
      .prepare("DELETE FROM companies WHERE id = ?1")
      .bind(validId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }
}

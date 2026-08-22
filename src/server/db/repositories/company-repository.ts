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
import { buildCompanyWhere } from "@/server/db/company-query";
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

  async findPublishedBySlug(slug: string): Promise<Company | null> {
    const validSlug = createCompanySchema.shape.slug.parse(slug);
    const row = await this.db
      .prepare(
        `SELECT ${COMPANY_COLUMNS}
         FROM companies
         WHERE slug = ?1 AND publication_status = 'published'`,
      )
      .bind(validSlug)
      .first<CompanyRow>();
    return row ? mapCompany(row) : null;
  }

  async list(filters: CompanyListFilters = {}): Promise<Company[]> {
    const value = companyListFiltersSchema.parse(filters);
    const query = buildCompanyWhere(value);
    const parameters = [...query.parameters];
    parameters.push(value.limit, value.offset);
    const limitIndex = parameters.length - 1;
    const offsetIndex = parameters.length;
    const result = await this.db
      .prepare(
        `SELECT ${COMPANY_COLUMNS}
         FROM companies
         ${query.where}
         ORDER BY name ASC, id ASC
         LIMIT ?${limitIndex} OFFSET ?${offsetIndex}`,
      )
      .bind(...parameters)
      .all<CompanyRow>();

    return result.results.map(mapCompany);
  }

  async count(filters: CompanyListFilters = {}): Promise<number> {
    const value = companyListFiltersSchema.parse(filters);
    const query = buildCompanyWhere(value);
    const row = await this.db
      .prepare(`SELECT COUNT(*) AS count FROM companies ${query.where}`)
      .bind(...query.parameters)
      .first<{ count: number }>();

    return row?.count ?? 0;
  }

  async listIndustries(
    publicationStatus: Company["publicationStatus"] = "published",
  ): Promise<string[]> {
    const value =
      companyListFiltersSchema.shape.publicationStatus.parse(publicationStatus);
    const result = await this.db
      .prepare(
        `SELECT DISTINCT industry
         FROM companies
         WHERE publication_status = ?1 AND industry IS NOT NULL
         ORDER BY industry ASC`,
      )
      .bind(value)
      .all<{ industry: string }>();

    return result.results.map((row) => row.industry);
  }

  async listPublishedSitemapEntries(): Promise<
    Array<{ slug: string; updatedAt: string }>
  > {
    const result = await this.db
      .prepare(
        `SELECT slug, updated_at
         FROM companies
         WHERE publication_status = 'published'
         ORDER BY slug ASC`,
      )
      .all<{ slug: string; updated_at: string }>();
    return result.results.map((row) => ({
      slug: row.slug,
      updatedAt: row.updated_at,
    }));
  }

  async listRecentlyUpdated(limit = 5): Promise<Company[]> {
    const validLimit = companyListFiltersSchema.shape.limit.parse(limit);
    const result = await this.db
      .prepare(
        `SELECT ${COMPANY_COLUMNS}
         FROM companies
         ORDER BY updated_at DESC, id DESC
         LIMIT ?1`,
      )
      .bind(validLimit)
      .all<CompanyRow>();

    return result.results.map(mapCompany);
  }

  async markVerified(id: string, verifiedAt: string): Promise<Company | null> {
    const validId = idSchema.parse(id);
    const timestamp = createCompanySchema.shape.lastVerifiedAt
      .unwrap()
      .parse(verifiedAt);
    await this.db
      .prepare(
        `UPDATE companies
         SET last_verified_at = ?1,
             remote_verified_at = ?1,
             recruiting_verified_at = ?1,
             updated_at = ?1
         WHERE id = ?2`,
      )
      .bind(timestamp, validId)
      .run();
    return this.findById(validId);
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

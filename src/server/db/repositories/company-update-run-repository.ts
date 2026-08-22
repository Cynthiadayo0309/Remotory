import { mapCompanyUpdateRun } from "@/server/db/mappers";
import {
  mergeRepositoryDependencies,
  type RepositoryDependencies,
} from "@/server/db/repository-dependencies";
import type { CompanyUpdateRunRow } from "@/server/db/rows";
import type {
  CompanyUpdateProgress,
  CompanyUpdateRun,
} from "@/types/update-run";
import { idSchema } from "@/validation/company";
import { createCompanyCheckSchema } from "@/validation/company";
import {
  companyUpdateProgressSchema,
  companyUpdatePendingLimitSchema,
  createCompanyUpdateRunSchema,
  type CreateCompanyUpdateRunInput,
} from "@/validation/update-run";

const RUN_COLUMNS = `
  id, workflow_instance_id, status,
  total_companies, processed_companies,
  unchanged_companies, changed_companies,
  needs_review_companies, failed_companies, candidate_count,
  error_message, started_at, completed_at, created_at, updated_at
`;

const OUTCOME_COLUMN = {
  unchanged: "unchanged_companies",
  changed: "changed_companies",
  needs_review: "needs_review_companies",
  failed: "failed_companies",
} as const;

export class CompanyUpdateRunRepository {
  private readonly dependencies: RepositoryDependencies;

  constructor(
    private readonly db: D1Database,
    dependencies?: Partial<RepositoryDependencies>,
  ) {
    this.dependencies = mergeRepositoryDependencies(dependencies);
  }

  async create(input: CreateCompanyUpdateRunInput): Promise<CompanyUpdateRun> {
    const value = createCompanyUpdateRunSchema.parse(input);
    const timestamp = this.dependencies.now();
    await this.db
      .prepare(
        `INSERT INTO company_update_runs (${RUN_COLUMNS})
         VALUES (
           ?1, ?2, 'queued', ?3, 0, 0, 0, 0, 0, 0,
           NULL, NULL, NULL, ?4, ?4
         )`,
      )
      .bind(value.id, value.workflowInstanceId, value.totalCompanies, timestamp)
      .run();

    const run = await this.findById(value.id);
    if (!run) throw new Error("Created update run could not be loaded");
    return run;
  }

  async createForPublishedCompanies(input: {
    id: string;
    workflowInstanceId: string;
  }): Promise<CompanyUpdateRun> {
    const id = idSchema.parse(input.id);
    const workflowInstanceId =
      createCompanyUpdateRunSchema.shape.workflowInstanceId.parse(
        input.workflowInstanceId,
      );
    const timestamp = this.dependencies.now();
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO company_update_runs (${RUN_COLUMNS})
           SELECT ?1, ?2, 'queued', COUNT(*), 0, 0, 0, 0, 0, 0,
                  NULL, NULL, NULL, ?3, ?3
           FROM companies
           WHERE publication_status = 'published'`,
        )
        .bind(id, workflowInstanceId, timestamp),
      this.db
        .prepare(
          `INSERT INTO company_update_run_checks (
             run_id, company_id, check_id, outcome, candidate_count,
             progress_token, processed_at, created_at
           )
           SELECT ?1, id, NULL, NULL, 0, NULL, NULL, ?2
           FROM companies
           WHERE publication_status = 'published'`,
        )
        .bind(id, timestamp),
    ]);
    return this.requireById(id);
  }

  async listPendingTargetCompanyIds(
    runId: string,
    limit: number,
  ): Promise<string[]> {
    const validRunId = idSchema.parse(runId);
    const validLimit = companyUpdatePendingLimitSchema.parse(limit);
    const result = await this.db
      .prepare(
        `SELECT company_id
         FROM company_update_run_checks
         WHERE run_id = ?1 AND processed_at IS NULL
         ORDER BY company_id ASC
         LIMIT ?2`,
      )
      .bind(validRunId, validLimit)
      .all<{ company_id: string }>();
    return result.results.map(({ company_id }) => company_id);
  }

  async countPendingTargets(runId: string): Promise<number> {
    const validRunId = idSchema.parse(runId);
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM company_update_run_checks
         WHERE run_id = ?1 AND processed_at IS NULL`,
      )
      .bind(validRunId)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  async findById(id: string): Promise<CompanyUpdateRun | null> {
    const validId = idSchema.parse(id);
    const row = await this.db
      .prepare(`SELECT ${RUN_COLUMNS} FROM company_update_runs WHERE id = ?1`)
      .bind(validId)
      .first<CompanyUpdateRunRow>();
    return row ? mapCompanyUpdateRun(row) : null;
  }

  async findLatest(): Promise<CompanyUpdateRun | null> {
    const row = await this.db
      .prepare(
        `SELECT ${RUN_COLUMNS}
         FROM company_update_runs
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
      )
      .first<CompanyUpdateRunRow>();
    return row ? mapCompanyUpdateRun(row) : null;
  }

  async findActive(): Promise<CompanyUpdateRun | null> {
    const row = await this.db
      .prepare(
        `SELECT ${RUN_COLUMNS}
         FROM company_update_runs
         WHERE status IN ('queued', 'running')
         ORDER BY created_at ASC, id ASC
         LIMIT 1`,
      )
      .first<CompanyUpdateRunRow>();
    return row ? mapCompanyUpdateRun(row) : null;
  }

  async markRunning(id: string, startedAt: string): Promise<CompanyUpdateRun> {
    const validId = idSchema.parse(id);
    await this.db
      .prepare(
        `UPDATE company_update_runs
         SET status = 'running', started_at = COALESCE(started_at, ?1),
             updated_at = ?1
         WHERE id = ?2 AND status IN ('queued', 'running')`,
      )
      .bind(startedAt, validId)
      .run();
    return this.requireById(validId);
  }

  async prepareCheck(
    runId: string,
    companyId: string,
    startedAt: string,
  ): Promise<string> {
    const validRunId = idSchema.parse(runId);
    const validCompanyId = idSchema.parse(companyId);
    const validStartedAt =
      createCompanyCheckSchema.shape.startedAt.parse(startedAt);
    const checkId = idSchema.parse(this.dependencies.generateId());
    const createdAt = this.dependencies.now();

    await this.db.batch([
      this.db
        .prepare(
          `INSERT OR IGNORE INTO company_update_run_checks
             (run_id, company_id, check_id, outcome, candidate_count,
              progress_token, processed_at, created_at)
           VALUES (?1, ?2, NULL, NULL, 0, NULL, NULL, ?3)`,
        )
        .bind(validRunId, validCompanyId, createdAt),
      this.db
        .prepare(
          `INSERT INTO company_checks (
             id, company_id, started_at, completed_at, status,
             content_changed, ai_used, ai_confidence,
             error_code, error_message, created_at
           )
           SELECT ?1, ?2, ?3, NULL, 'failed', NULL, 0, NULL,
                  'CHECK_IN_PROGRESS', '確認処理を実行中です', ?4
           WHERE EXISTS (
             SELECT 1 FROM company_update_run_checks
             WHERE run_id = ?5 AND company_id = ?2 AND check_id IS NULL
           )`,
        )
        .bind(checkId, validCompanyId, validStartedAt, createdAt, validRunId),
      this.db
        .prepare(
          `UPDATE company_update_run_checks
           SET check_id = ?1
           WHERE run_id = ?2 AND company_id = ?3 AND check_id IS NULL`,
        )
        .bind(checkId, validRunId, validCompanyId),
    ]);

    const row = await this.db
      .prepare(
        `SELECT check_id FROM company_update_run_checks
         WHERE run_id = ?1 AND company_id = ?2`,
      )
      .bind(validRunId, validCompanyId)
      .first<{ check_id: string | null }>();
    if (!row?.check_id) throw new Error("Company check could not be prepared");
    return idSchema.parse(row.check_id);
  }

  async recordProgress(
    id: string,
    checkId: string,
    progress: CompanyUpdateProgress,
  ): Promise<CompanyUpdateRun> {
    const validId = idSchema.parse(id);
    const validCheckId = idSchema.parse(checkId);
    const value = companyUpdateProgressSchema.parse(progress);
    const outcomeColumn = OUTCOME_COLUMN[value.outcome];
    const timestamp = this.dependencies.now();
    const progressToken = this.dependencies.generateId();
    await this.db.batch([
      this.db
        .prepare(
          `UPDATE company_update_run_checks
           SET outcome = ?1, candidate_count = ?2,
               progress_token = ?3, processed_at = ?4
           WHERE run_id = ?5 AND check_id = ?6 AND processed_at IS NULL`,
        )
        .bind(
          value.outcome,
          value.candidateCount,
          progressToken,
          timestamp,
          validId,
          validCheckId,
        ),
      this.db
        .prepare(
          `UPDATE company_update_runs
           SET processed_companies = processed_companies + 1,
               ${outcomeColumn} = ${outcomeColumn} + 1,
               candidate_count = candidate_count + ?1,
               updated_at = ?2
           WHERE id = ?3 AND status = 'running'
             AND processed_companies < total_companies
             AND EXISTS (
               SELECT 1 FROM company_update_run_checks
               WHERE run_id = ?3 AND check_id = ?4 AND progress_token = ?5
             )`,
        )
        .bind(
          value.candidateCount,
          timestamp,
          validId,
          validCheckId,
          progressToken,
        ),
    ]);
    return this.requireById(validId);
  }

  async markCompleted(
    id: string,
    completedAt: string,
  ): Promise<CompanyUpdateRun> {
    const validId = idSchema.parse(id);
    await this.db
      .prepare(
        `UPDATE company_update_runs
         SET status = 'completed', completed_at = ?1, updated_at = ?1
         WHERE id = ?2 AND status = 'running'`,
      )
      .bind(completedAt, validId)
      .run();
    return this.requireById(validId);
  }

  async markFailed(
    id: string,
    errorMessage: string,
    completedAt: string,
  ): Promise<CompanyUpdateRun> {
    const validId = idSchema.parse(id);
    const safeMessage =
      errorMessage.trim().slice(0, 2_000) || "Workflow failed";
    await this.db
      .prepare(
        `UPDATE company_update_runs
         SET status = 'failed', error_message = ?1,
             completed_at = ?2, updated_at = ?2
         WHERE id = ?3 AND status IN ('queued', 'running')`,
      )
      .bind(safeMessage, completedAt, validId)
      .run();
    return this.requireById(validId);
  }

  private async requireById(id: string): Promise<CompanyUpdateRun> {
    const run = await this.findById(id);
    if (!run) throw new Error("Update run could not be loaded");
    return run;
  }
}

import { env } from "cloudflare:workers";
import { beforeEach, describe, it } from "vitest";

import { createRepositories } from "@/server/db";

import { baseCompanyInput, clearDatabase } from "./test-helpers";

describe("D1 schema constraints", () => {
  beforeEach(clearDatabase);

  it("rejects duplicate company slugs and duplicate source URLs", async ({
    expect,
  }) => {
    const repositories = createRepositories(env.DB);
    const company = await repositories.companies.create(baseCompanyInput);

    await expect(
      repositories.companies.create({
        ...baseCompanyInput,
        name: "別の架空企業",
      }),
    ).rejects.toThrow();

    const sourceInput = {
      companyId: company.id,
      sourceType: "recruit" as const,
      url: "https://example.com/test-company/jobs",
    };
    await repositories.companySources.create(sourceInput);
    await expect(
      repositories.companySources.create(sourceInput),
    ).rejects.toThrow();
  });

  it("enforces enum-like CHECK constraints", async ({ expect }) => {
    const companyId = crypto.randomUUID();
    await expect(
      env.DB.prepare(
        `INSERT INTO companies (
          id, slug, name, remote_scope, work_location_scope,
          office_required, recruiting_status, publication_status,
          created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      )
        .bind(
          companyId,
          "invalid-status-company",
          "不正値テスト株式会社",
          "invalid",
          "nationwide",
          "no",
          "open",
          "published",
          "2026-08-19T00:00:00.000Z",
          "2026-08-19T00:00:00.000Z",
        )
        .run(),
    ).rejects.toThrow();
  });

  it("cascades company deletion and clears all dependent records", async ({
    expect,
  }) => {
    const repositories = createRepositories(env.DB);
    const company = await repositories.companies.create(baseCompanyInput);
    await repositories.companySources.create({
      companyId: company.id,
      sourceType: "official",
      url: "https://example.com/test-company",
    });
    const check = await repositories.companyChecks.create({
      companyId: company.id,
      status: "success",
    });
    await repositories.companyChangeCandidates.create({
      companyId: company.id,
      checkId: check.id,
      fieldName: "remote_scope",
      oldValue: "unknown",
      newValue: "partial",
    });

    await repositories.companies.delete(company.id);

    for (const table of [
      "company_sources",
      "company_checks",
      "company_change_candidates",
    ]) {
      const row = await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM ${table}`,
      ).first<{ count: number }>();
      expect(row?.count).toBe(0);
    }
  });
});

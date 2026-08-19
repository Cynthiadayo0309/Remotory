import { env } from "cloudflare:workers";
import { beforeEach, describe, it } from "vitest";

import { createRepositories } from "@/server/db";

import { baseCompanyInput, clearDatabase } from "./test-helpers";

describe("D1 repositories", () => {
  beforeEach(clearDatabase);

  it("creates, filters, updates, and deletes companies", async ({ expect }) => {
    const repositories = createRepositories(env.DB);
    const created = await repositories.companies.create(baseCompanyInput);

    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(await repositories.companies.findBySlug("test-company")).toEqual(
      created,
    );

    const updated = await repositories.companies.update(created.id, {
      name: "更新後テスト株式会社",
      recruitingStatus: "closed",
    });
    expect(updated?.name).toBe("更新後テスト株式会社");
    expect(updated?.recruitingStatus).toBe("closed");

    const listed = await repositories.companies.list({
      keyword: "更新後",
      recruitingStatus: "closed",
      publicationStatus: "published",
    });
    expect(listed.map((company) => company.id)).toEqual([created.id]);

    expect(await repositories.companies.delete(created.id)).toBe(true);
    expect(await repositories.companies.findById(created.id)).toBeNull();
  });

  it("supports CRUD for sources, checks, and change candidates", async ({
    expect,
  }) => {
    const repositories = createRepositories(env.DB);
    const company = await repositories.companies.create(baseCompanyInput);

    const source = await repositories.companySources.create({
      companyId: company.id,
      sourceType: "recruit",
      url: "https://example.com/test-company/careers",
    });
    expect(source.isActive).toBe(true);
    expect(
      await repositories.companySources.listByCompany(company.id),
    ).toHaveLength(1);
    const updatedSource = await repositories.companySources.update(source.id, {
      isActive: false,
      lastFetchStatus: "failed",
      consecutiveFailures: 1,
    });
    expect(updatedSource).toMatchObject({
      isActive: false,
      lastFetchStatus: "failed",
      consecutiveFailures: 1,
    });

    const check = await repositories.companyChecks.create({
      companyId: company.id,
      status: "changed",
      contentChanged: true,
      aiUsed: false,
    });
    const updatedCheck = await repositories.companyChecks.update(check.id, {
      completedAt: "2026-08-19T02:00:00.000Z",
      aiUsed: true,
      aiConfidence: 0.91,
    });
    expect(updatedCheck).toMatchObject({ aiUsed: true, aiConfidence: 0.91 });
    expect(
      await repositories.companyChecks.listByCompany(company.id),
    ).toHaveLength(1);

    const candidate = await repositories.companyChangeCandidates.create({
      companyId: company.id,
      checkId: check.id,
      fieldName: "recruiting_status",
      oldValue: "closed",
      newValue: "open",
      evidenceText: "対象ポジションの募集を確認しました。",
      sourceUrl: source.url,
      confidence: 0.91,
    });
    expect(
      await repositories.companyChangeCandidates.listByReviewStatus("pending"),
    ).toHaveLength(1);
    const reviewed = await repositories.companyChangeCandidates.update(
      candidate.id,
      {
        reviewStatus: "rejected",
        reviewedAt: "2026-08-19T03:00:00.000Z",
      },
    );
    expect(reviewed?.reviewStatus).toBe("rejected");

    expect(
      await repositories.companyChangeCandidates.delete(candidate.id),
    ).toBe(true);
    expect(await repositories.companyChecks.delete(check.id)).toBe(true);
    expect(await repositories.companySources.delete(source.id)).toBe(true);
  });
});

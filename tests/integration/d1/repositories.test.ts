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
    expect(
      await repositories.companies.findPublishedBySlug("test-company"),
    ).toEqual(updated);
    expect(
      await repositories.companies.count({ publicationStatus: "published" }),
    ).toBe(1);
    expect(await repositories.companies.listIndustries("published")).toEqual([
      "ソフトウェア",
    ]);
    expect(await repositories.companies.listPublishedSitemapEntries()).toEqual([
      { slug: updated?.slug, updatedAt: updated?.updatedAt },
    ]);

    const reviewOnly = await repositories.companies.create({
      ...baseCompanyInput,
      slug: "review-only-company",
      name: "確認待ち株式会社",
      industry: "コンサルティング",
      publicationStatus: "needs_review",
    });
    expect(
      await repositories.companies.findPublishedBySlug(reviewOnly.slug),
    ).toBeNull();
    expect(
      await repositories.companies.count({ publicationStatus: "published" }),
    ).toBe(1);
    expect(await repositories.companies.listIndustries("published")).toEqual([
      "ソフトウェア",
    ]);
    expect(await repositories.companies.listPublishedSitemapEntries()).toEqual([
      { slug: updated?.slug, updatedAt: updated?.updatedAt },
    ]);

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
    expect(
      await repositories.companySources.listActiveByCompany(company.id),
    ).toHaveLength(0);

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

  it("paginates companies in 20-item server-side slices", async ({
    expect,
  }) => {
    const repositories = createRepositories(env.DB);
    for (let index = 1; index <= 21; index += 1) {
      const suffix = String(index).padStart(2, "0");
      await repositories.companies.create({
        ...baseCompanyInput,
        slug: `page-company-${suffix}`,
        name: `ページ確認株式会社${suffix}`,
      });
    }

    const firstPage = await repositories.companies.list({
      publicationStatus: "published",
      limit: 20,
      offset: 0,
    });
    const secondPage = await repositories.companies.list({
      publicationStatus: "published",
      limit: 20,
      offset: 20,
    });

    expect(firstPage).toHaveLength(20);
    expect(secondPage).toHaveLength(1);
    expect(secondPage[0]?.slug).toBe("page-company-21");
    expect(
      await repositories.companies.count({ publicationStatus: "published" }),
    ).toBe(21);
  });

  it("provides dashboard counts and recent updates", async ({ expect }) => {
    let now = "2026-08-20T01:00:00.000Z";
    const repositories = createRepositories(env.DB, {
      now: () => now,
    });
    const first = await repositories.companies.create(baseCompanyInput);
    await repositories.companies.create({
      ...baseCompanyInput,
      slug: "review-company",
      name: "要確認株式会社",
      publicationStatus: "needs_review",
    });
    now = "2026-08-20T02:00:00.000Z";
    await repositories.companies.update(first.id, { name: "更新企業株式会社" });
    await repositories.companyChangeCandidates.create({
      companyId: first.id,
      fieldName: "recruiting_status",
      newValue: "closed",
    });

    expect(await repositories.companies.count()).toBe(2);
    expect(
      await repositories.companies.count({
        publicationStatus: "needs_review",
      }),
    ).toBe(1);
    expect(
      await repositories.companyChangeCandidates.countByReviewStatus("pending"),
    ).toBe(1);
    expect((await repositories.companies.listRecentlyUpdated(1))[0]?.id).toBe(
      first.id,
    );
  });
});

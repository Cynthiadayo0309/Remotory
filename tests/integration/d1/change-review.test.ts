import { env } from "cloudflare:workers";
import { beforeEach, describe, it } from "vitest";

import { createRepositories } from "@/server/db";
import { createChangeCandidatesFromAnalysis } from "@/server/reviews";

import { baseCompanyInput, clearDatabase } from "./test-helpers";

describe("change candidate review", () => {
  beforeEach(clearDatabase);

  it("approves a pending candidate and updates only its company field atomically", async ({
    expect,
  }) => {
    const reviewedAt = "2026-08-22T02:00:00.000Z";
    const repositories = createRepositories(env.DB, { now: () => reviewedAt });
    const company = await repositories.companies.create(baseCompanyInput);
    const candidate = await repositories.companyChangeCandidates.create({
      companyId: company.id,
      fieldName: "recruiting_status",
      oldValue: "open",
      newValue: "closed",
      evidenceText: "現在募集していません",
      sourceUrl: "https://example.com/test-company/careers",
      confidence: 0.92,
    });

    const result = await repositories.companyChangeReviews.approve(
      candidate.id,
    );
    expect(result).toMatchObject({
      ok: true,
      candidate: { reviewStatus: "approved", reviewedAt },
      company: { recruitingStatus: "closed", updatedAt: reviewedAt },
    });
    expect(
      (await repositories.companies.findById(company.id))?.remoteScope,
    ).toBe(company.remoteScope);
  });

  it("rejects a candidate without changing the company", async ({ expect }) => {
    const repositories = createRepositories(env.DB, {
      now: () => "2026-08-22T03:00:00.000Z",
    });
    const company = await repositories.companies.create(baseCompanyInput);
    const candidate = await repositories.companyChangeCandidates.create({
      companyId: company.id,
      fieldName: "remote_scope",
      oldValue: "partial",
      newValue: "all",
    });

    const result = await repositories.companyChangeReviews.reject(candidate.id);
    expect(result).toMatchObject({
      ok: true,
      candidate: { reviewStatus: "rejected" },
      company: { remoteScope: "partial" },
    });
  });

  it("leaves a stale candidate pending when the current value has changed", async ({
    expect,
  }) => {
    const repositories = createRepositories(env.DB);
    const company = await repositories.companies.create(baseCompanyInput);
    const candidate = await repositories.companyChangeCandidates.create({
      companyId: company.id,
      fieldName: "recruiting_status",
      oldValue: "open",
      newValue: "closed",
    });
    await repositories.companies.update(company.id, {
      recruitingStatus: "unknown",
    });

    expect(
      await repositories.companyChangeReviews.approve(candidate.id),
    ).toMatchObject({
      ok: false,
      reason: "stale_value",
      candidate: { reviewStatus: "pending" },
    });
    expect(
      (await repositories.companies.findById(company.id))?.recruitingStatus,
    ).toBe("unknown");
  });

  it("prevents a second review from overwriting the first decision", async ({
    expect,
  }) => {
    const repositories = createRepositories(env.DB);
    const company = await repositories.companies.create(baseCompanyInput);
    const candidate = await repositories.companyChangeCandidates.create({
      companyId: company.id,
      fieldName: "remote_scope",
      oldValue: "partial",
      newValue: "all",
    });

    await repositories.companyChangeReviews.reject(candidate.id);
    expect(
      await repositories.companyChangeReviews.approve(candidate.id),
    ).toMatchObject({
      ok: false,
      reason: "already_reviewed",
      candidate: { reviewStatus: "rejected" },
    });
  });

  it("supports nullable note values using a null-safe old value comparison", async ({
    expect,
  }) => {
    const repositories = createRepositories(env.DB);
    const company = await repositories.companies.create(baseCompanyInput);
    const candidate = await repositories.companyChangeCandidates.create({
      companyId: company.id,
      fieldName: "office_note",
      oldValue: null,
      newValue: "年1回の全社会議",
    });

    expect(
      await repositories.companyChangeReviews.approve(candidate.id),
    ).toMatchObject({
      ok: true,
      company: { officeNote: "年1回の全社会議" },
    });
  });

  it("creates one candidate per check and field when generation is retried", async ({
    expect,
  }) => {
    let sequence = 0;
    const repositories = createRepositories(env.DB, {
      generateId: () =>
        `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
    });
    const company = await repositories.companies.create(baseCompanyInput);
    const check = await repositories.companyChecks.create({
      companyId: company.id,
      status: "changed",
      contentChanged: true,
      aiUsed: true,
    });
    const input = {
      companyId: company.id,
      checkId: check.id,
      fieldName: "remote_scope" as const,
      oldValue: "partial",
      newValue: "all",
    };

    const first =
      await repositories.companyChangeCandidates.createManyForCheckIfAbsent([
        input,
      ]);
    const retried =
      await repositories.companyChangeCandidates.createManyForCheckIfAbsent([
        input,
      ]);

    expect(retried[0]?.id).toBe(first[0]?.id);
    expect(
      await repositories.companyChangeCandidates.listByCompany(company.id),
    ).toHaveLength(1);
  });

  it("persists AI diffs only for a check belonging to the same company", async ({
    expect,
  }) => {
    const repositories = createRepositories(env.DB);
    const company = await repositories.companies.create(baseCompanyInput);
    const check = await repositories.companyChecks.create({
      companyId: company.id,
      status: "changed",
      contentChanged: true,
      aiUsed: true,
    });
    const sourceUrl = "https://example.com/test-company/careers";
    const analysis = {
      full_remote: true,
      remote_scope: "all" as const,
      work_location_scope: "nationwide" as const,
      work_location_note: null,
      office_required: "no" as const,
      office_note: null,
      recruiting_status: "open" as const,
      confidence: 0.95,
      evidence: [
        {
          field: "full_remote" as const,
          text: "全職種でフルリモート勤務が可能です",
          source_url: sourceUrl,
        },
        {
          field: "remote_scope" as const,
          text: "全職種でフルリモート勤務が可能です",
          source_url: sourceUrl,
        },
        {
          field: "work_location_scope" as const,
          text: "日本全国から勤務できます",
          source_url: sourceUrl,
        },
        {
          field: "office_required" as const,
          text: "出社は不要です",
          source_url: sourceUrl,
        },
        {
          field: "recruiting_status" as const,
          text: "現在募集中です",
          source_url: sourceUrl,
        },
      ],
    };

    const first = await createChangeCandidatesFromAnalysis(env.DB, {
      companyId: company.id,
      checkId: check.id,
      analysis,
    });
    const retried = await createChangeCandidatesFromAnalysis(env.DB, {
      companyId: company.id,
      checkId: check.id,
      analysis,
    });

    expect(first).toMatchObject({
      ok: true,
      candidates: [{ fieldName: "remote_scope", newValue: "all" }],
    });
    expect(retried).toMatchObject({
      ok: true,
      candidates: [{ id: first.ok ? first.candidates[0]?.id : "" }],
    });

    const otherCompany = await repositories.companies.create({
      ...baseCompanyInput,
      slug: "other-company",
      name: "別の架空企業",
    });
    await expect(
      createChangeCandidatesFromAnalysis(env.DB, {
        companyId: otherCompany.id,
        checkId: check.id,
        analysis,
      }),
    ).resolves.toEqual({ ok: false, reason: "check_mismatch" });
  });
});

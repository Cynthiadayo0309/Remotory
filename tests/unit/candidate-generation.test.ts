import { describe, expect, it } from "vitest";

import { generateCompanyChangeCandidates } from "@/server/reviews";
import type { AiRemotePolicyAnalysis } from "@/server/ai/types";
import type { Company } from "@/types/company";

const sourceUrl = "https://example.test/careers";
const checkId = "20000000-0000-4000-8000-000000000001";

const company: Company = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "fictional-company",
  name: "架空リモート株式会社",
  description: null,
  officialUrl: null,
  recruitUrl: sourceUrl,
  industry: null,
  remoteScope: "partial",
  workLocationScope: "nationwide",
  workLocationNote: null,
  officeRequired: "no",
  officeNote: null,
  recruitingStatus: "open",
  publicationStatus: "published",
  lastVerifiedAt: null,
  remoteVerifiedAt: null,
  recruitingVerifiedAt: null,
  createdAt: "2026-08-22T00:00:00.000Z",
  updatedAt: "2026-08-22T00:00:00.000Z",
};

function evidence(
  field: AiRemotePolicyAnalysis["evidence"][number]["field"],
  text: string,
) {
  return { field, text, source_url: sourceUrl };
}

const changedAnalysis: AiRemotePolicyAnalysis = {
  full_remote: true,
  remote_scope: "all",
  work_location_scope: "restricted",
  work_location_note: "国内の指定地域に居住できる方",
  office_required: "yes",
  office_note: "月1回の全社会議",
  recruiting_status: "closed",
  confidence: 0.93,
  evidence: [
    evidence("full_remote", "全職種でフルリモート勤務が可能です"),
    evidence("remote_scope", "全職種でフルリモート勤務が可能です"),
    evidence("work_location_scope", "国内の指定地域に居住できる方"),
    evidence("work_location_note", "国内の指定地域に居住できる方"),
    evidence("office_required", "月1回の全社会議に出社が必要です"),
    evidence("office_note", "月1回の全社会議に出社が必要です"),
    evidence("recruiting_status", "現在募集していません"),
  ],
};

describe("generateCompanyChangeCandidates", () => {
  it("creates evidence-backed diffs for the six managed fields", () => {
    const result = generateCompanyChangeCandidates({
      company,
      checkId,
      analysis: changedAnalysis,
    });

    expect(result.issues).toEqual([]);
    expect(result.candidates.map(({ fieldName }) => fieldName)).toEqual([
      "remote_scope",
      "work_location_scope",
      "work_location_note",
      "office_required",
      "office_note",
      "recruiting_status",
    ]);
    expect(result.candidates[0]).toMatchObject({
      oldValue: "partial",
      newValue: "all",
      sourceUrl,
      confidence: 0.93,
      reviewStatus: "pending",
    });
  });

  it("does not create a candidate for unchanged fields", () => {
    const analysis: AiRemotePolicyAnalysis = {
      full_remote: true,
      remote_scope: "partial",
      work_location_scope: "nationwide",
      work_location_note: null,
      office_required: "no",
      office_note: null,
      recruiting_status: "open",
      confidence: 0.9,
      evidence: [
        evidence("full_remote", "フルリモート勤務が可能です"),
        evidence("remote_scope", "一部職種でフルリモート勤務が可能です"),
        evidence("work_location_scope", "日本全国から勤務できます"),
        evidence("office_required", "出社は不要です"),
        evidence("recruiting_status", "現在募集中です"),
      ],
    };

    expect(
      generateCompanyChangeCandidates({ company, checkId, analysis }),
    ).toEqual({ candidates: [], issues: [] });
  });

  it("never replaces known values with unknown", () => {
    const analysis: AiRemotePolicyAnalysis = {
      full_remote: null,
      remote_scope: "unknown",
      work_location_scope: "unknown",
      work_location_note: null,
      office_required: "unknown",
      office_note: null,
      recruiting_status: "unknown",
      confidence: 0.8,
      evidence: [],
    };

    const result = generateCompanyChangeCandidates({
      company,
      checkId,
      analysis,
    });
    expect(result.candidates).toEqual([]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          field: "remote_scope",
          reason: "unknown_value_not_actionable",
        },
        {
          field: "recruiting_status",
          reason: "unknown_value_not_actionable",
        },
      ]),
    );
  });

  it("uses the parent field evidence when clearing dependent notes", () => {
    const current = {
      ...company,
      workLocationScope: "restricted" as const,
      workLocationNote: "東京近郊",
      officeRequired: "yes" as const,
      officeNote: "四半期ごと",
    };
    const analysis: AiRemotePolicyAnalysis = {
      full_remote: true,
      remote_scope: "partial",
      work_location_scope: "nationwide",
      work_location_note: null,
      office_required: "no",
      office_note: null,
      recruiting_status: "open",
      confidence: 0.94,
      evidence: [
        evidence("full_remote", "フルリモート勤務が可能です"),
        evidence("remote_scope", "一部職種でフルリモート勤務が可能です"),
        evidence("work_location_scope", "日本全国から勤務できます"),
        evidence("office_required", "出社は不要です"),
        evidence("recruiting_status", "現在募集中です"),
      ],
    };

    const result = generateCompanyChangeCandidates({
      company: current,
      checkId,
      analysis,
    });
    expect(
      result.candidates.find(
        ({ fieldName }) => fieldName === "work_location_note",
      ),
    ).toMatchObject({
      newValue: null,
      evidenceText: "日本全国から勤務できます",
    });
    expect(
      result.candidates.find(({ fieldName }) => fieldName === "office_note"),
    ).toMatchObject({ newValue: null, evidenceText: "出社は不要です" });
  });

  it("flags explicit loss of full-remote eligibility for manual attention", () => {
    const analysis: AiRemotePolicyAnalysis = {
      full_remote: false,
      remote_scope: "unknown",
      work_location_scope: "unknown",
      work_location_note: null,
      office_required: "unknown",
      office_note: null,
      recruiting_status: "unknown",
      confidence: 0.9,
      evidence: [evidence("full_remote", "フルリモート勤務はできません")],
    };

    const result = generateCompanyChangeCandidates({
      company,
      checkId,
      analysis,
    });
    expect(result.issues).toContainEqual({
      field: "full_remote",
      reason: "full_remote_not_confirmed",
    });
  });
});

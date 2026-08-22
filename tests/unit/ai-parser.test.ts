import { describe, expect, it } from "vitest";

import { parseAiRemotePolicyResponse } from "@/server/ai/parser";

const sourceUrl = "https://example.test/recruit";
const sourceText =
  "一部職種でフルリモート勤務が可能です。現在、エンジニアを募集しています。";

const validAnalysis = {
  full_remote: true,
  remote_scope: "partial",
  work_location_scope: "unknown",
  work_location_note: null,
  office_required: "unknown",
  office_note: null,
  recruiting_status: "open",
  confidence: 0.91,
  evidence: [
    {
      field: "full_remote",
      text: "フルリモート勤務が可能です",
      source_url: sourceUrl,
    },
    {
      field: "remote_scope",
      text: "一部職種でフルリモート勤務が可能です",
      source_url: sourceUrl,
    },
    {
      field: "recruiting_status",
      text: "現在、エンジニアを募集しています",
      source_url: sourceUrl,
    },
  ],
};

describe("parseAiRemotePolicyResponse", () => {
  it("parses the Workers AI response envelope", () => {
    const result = parseAiRemotePolicyResponse(
      { response: JSON.stringify(validAnalysis) },
      { sourceUrl, sourceText },
    );

    expect(result).toEqual({ ok: true, analysis: validAnalysis });
  });

  it("accepts an already-decoded JSON object", () => {
    expect(
      parseAiRemotePolicyResponse(validAnalysis, { sourceUrl, sourceText }).ok,
    ).toBe(true);
  });

  it("accepts no evidence only when every result is unknown", () => {
    const result = parseAiRemotePolicyResponse(
      {
        full_remote: null,
        remote_scope: "unknown",
        work_location_scope: "unknown",
        work_location_note: null,
        office_required: "unknown",
        office_note: null,
        recruiting_status: "unknown",
        confidence: 0.8,
        evidence: [],
      },
      { sourceUrl, sourceText },
    );

    expect(result.ok).toBe(true);
  });

  it("rejects prose or fenced JSON", () => {
    const result = parseAiRemotePolicyResponse(
      { response: `\`\`\`json\n${JSON.stringify(validAnalysis)}\n\`\`\`` },
      { sourceUrl, sourceText },
    );

    expect(result).toEqual({ ok: false, reason: "MALFORMED_JSON" });
  });

  it("rejects values outside the schema and semantic rules", () => {
    const result = parseAiRemotePolicyResponse(
      {
        ...validAnalysis,
        office_required: "yes",
        office_note: null,
      },
      { sourceUrl, sourceText },
    );

    expect(result).toEqual({ ok: false, reason: "SCHEMA_INVALID" });
  });

  it("rejects evidence from a different URL", () => {
    const result = parseAiRemotePolicyResponse(
      {
        ...validAnalysis,
        evidence: validAnalysis.evidence.map((item) => ({
          ...item,
          source_url: "https://attacker.test/prompt",
        })),
      },
      { sourceUrl, sourceText },
    );

    expect(result).toEqual({
      ok: false,
      reason: "SOURCE_URL_MISMATCH",
    });
  });

  it("rejects invented or paraphrased evidence", () => {
    const result = parseAiRemotePolicyResponse(
      {
        ...validAnalysis,
        evidence: [
          ...validAnalysis.evidence.slice(0, 2),
          {
            ...validAnalysis.evidence[2],
            text: "常にエンジニアを積極採用しています",
          },
        ],
      },
      { sourceUrl, sourceText },
    );

    expect(result).toEqual({ ok: false, reason: "EVIDENCE_NOT_FOUND" });
  });
});

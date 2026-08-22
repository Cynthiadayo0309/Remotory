import { aiRemotePolicyAnalysisSchema } from "@/server/ai/schema";
import type { AiRemotePolicyAnalysis } from "@/server/ai/types";

export type AiParseFailureReason =
  | "MALFORMED_JSON"
  | "SCHEMA_INVALID"
  | "SOURCE_URL_MISMATCH"
  | "EVIDENCE_NOT_FOUND";

export type AiParseResult =
  | { ok: true; analysis: AiRemotePolicyAnalysis }
  | { ok: false; reason: AiParseFailureReason };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapResponse(value: unknown): unknown {
  if (isRecord(value) && "response" in value) return value.response;
  return value;
}

export function parseAiRemotePolicyResponse(
  rawResponse: unknown,
  context: { sourceUrl: string; sourceText: string },
): AiParseResult {
  let payload = unwrapResponse(rawResponse);

  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return { ok: false, reason: "MALFORMED_JSON" };
    }
  }

  const parsed = aiRemotePolicyAnalysisSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, reason: "SCHEMA_INVALID" };

  for (const evidence of parsed.data.evidence) {
    if (evidence.source_url !== context.sourceUrl) {
      return { ok: false, reason: "SOURCE_URL_MISMATCH" };
    }

    if (!context.sourceText.includes(evidence.text)) {
      return { ok: false, reason: "EVIDENCE_NOT_FOUND" };
    }
  }

  return { ok: true, analysis: parsed.data };
}

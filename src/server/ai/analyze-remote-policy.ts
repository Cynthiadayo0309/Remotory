import {
  AI_CONFIDENCE_THRESHOLD,
  AI_RESPONSE_MAX_TOKENS,
  WORKERS_AI_MODEL,
} from "@/server/ai/constants";
import { aiRemotePolicyJsonSchema } from "@/server/ai/json-schema";
import { parseAiRemotePolicyResponse } from "@/server/ai/parser";
import {
  buildRemotePolicyPrompt,
  REMOTE_POLICY_SYSTEM_PROMPT,
} from "@/server/ai/prompt";
import { aiAnalysisInputSchema } from "@/server/ai/schema";
import { prepareAiSourceText } from "@/server/ai/source-text";
import type {
  AiAnalysisInput,
  AiAnalysisResult,
  StructuredAiClient,
} from "@/server/ai/types";

const PARSE_FAILURE_MESSAGES = {
  MALFORMED_JSON: "AI response was not valid JSON.",
  SCHEMA_INVALID: "AI response did not match the required schema.",
  SOURCE_URL_MISMATCH: "AI evidence referenced an unexpected source URL.",
  EVIDENCE_NOT_FOUND:
    "AI evidence could not be found in the supplied source text.",
} as const;

export async function analyzeRemotePolicy(
  client: StructuredAiClient,
  input: AiAnalysisInput,
): Promise<AiAnalysisResult> {
  const validatedInput = aiAnalysisInputSchema.safeParse(input);
  if (!validatedInput.success) {
    return {
      ok: false,
      code: "AI_FAILED",
      reason: "INPUT_INVALID",
      retryable: false,
      message: "AI analysis input was invalid.",
    };
  }

  const source = prepareAiSourceText(validatedInput.data.normalizedText);

  let rawResponse: unknown;
  try {
    rawResponse = await client.generate({
      messages: [
        { role: "system", content: REMOTE_POLICY_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildRemotePolicyPrompt(validatedInput.data, source.text),
        },
      ],
      responseFormat: {
        type: "json_schema",
        jsonSchema: aiRemotePolicyJsonSchema as unknown as Record<
          string,
          unknown
        >,
      },
      maxTokens: AI_RESPONSE_MAX_TOKENS,
      temperature: 0,
    });
  } catch {
    return {
      ok: false,
      code: "AI_FAILED",
      reason: "REQUEST_FAILED",
      retryable: true,
      message: "Workers AI request failed.",
    };
  }

  const parsed = parseAiRemotePolicyResponse(rawResponse, {
    sourceUrl: validatedInput.data.sourceUrl,
    sourceText: source.text,
  });

  if (!parsed.ok) {
    const uncertain = ["SOURCE_URL_MISMATCH", "EVIDENCE_NOT_FOUND"].includes(
      parsed.reason,
    );

    return {
      ok: false,
      code: uncertain ? "AI_UNCERTAIN" : "AI_FAILED",
      reason: parsed.reason,
      retryable: !uncertain,
      message: PARSE_FAILURE_MESSAGES[parsed.reason],
    };
  }

  if (parsed.analysis.confidence < AI_CONFIDENCE_THRESHOLD) {
    return {
      ok: false,
      code: "AI_UNCERTAIN",
      reason: "LOW_CONFIDENCE",
      retryable: false,
      message: "AI confidence was below the review threshold.",
    };
  }

  return {
    ok: true,
    analysis: parsed.analysis,
    model: WORKERS_AI_MODEL,
    sourceTextChars: source.text.length,
    sourceTextTruncated: source.truncated,
  };
}

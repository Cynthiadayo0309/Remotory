import type { z } from "zod";

import type {
  aiAnalysisInputSchema,
  aiRemotePolicyAnalysisSchema,
} from "@/server/ai/schema";

export type AiAnalysisInput = z.infer<typeof aiAnalysisInputSchema>;
export type AiRemotePolicyAnalysis = z.infer<
  typeof aiRemotePolicyAnalysisSchema
>;

export interface AiGenerationRequest {
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
  responseFormat: {
    type: "json_schema";
    jsonSchema: Record<string, unknown>;
  };
  maxTokens: number;
  temperature: number;
}

export interface StructuredAiClient {
  generate(request: AiGenerationRequest): Promise<unknown>;
}

export type AiAnalysisFailureReason =
  | "INPUT_INVALID"
  | "REQUEST_FAILED"
  | "MALFORMED_JSON"
  | "SCHEMA_INVALID"
  | "SOURCE_URL_MISMATCH"
  | "EVIDENCE_NOT_FOUND"
  | "LOW_CONFIDENCE";

export type AiAnalysisResult =
  | {
      ok: true;
      analysis: AiRemotePolicyAnalysis;
      model: string;
      sourceTextChars: number;
      sourceTextTruncated: boolean;
    }
  | {
      ok: false;
      code: "AI_FAILED" | "AI_UNCERTAIN";
      reason: AiAnalysisFailureReason;
      retryable: boolean;
      message: string;
    };

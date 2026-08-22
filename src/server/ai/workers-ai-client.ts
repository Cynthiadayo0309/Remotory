import { WORKERS_AI_MODEL } from "@/server/ai/constants";
import type {
  AiGenerationRequest,
  StructuredAiClient,
} from "@/server/ai/types";

export type WorkersAiRunner = (
  model: typeof WORKERS_AI_MODEL,
  input: {
    messages: Array<{ role: string; content: string }>;
    response_format: {
      type: "json_schema";
      json_schema: Record<string, unknown>;
    };
    stream: false;
    max_tokens: number;
    temperature: number;
  },
) => Promise<unknown>;

export class WorkersAiStructuredClient implements StructuredAiClient {
  constructor(private readonly runModel: WorkersAiRunner) {}

  generate(request: AiGenerationRequest): Promise<unknown> {
    return this.runModel(WORKERS_AI_MODEL, {
      messages: request.messages,
      response_format: {
        type: request.responseFormat.type,
        json_schema: request.responseFormat.jsonSchema,
      },
      stream: false,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
    });
  }
}

export function createWorkersAiClient(ai: Ai): StructuredAiClient {
  return new WorkersAiStructuredClient((model, input) => ai.run(model, input));
}

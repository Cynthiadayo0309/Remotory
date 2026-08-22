import { describe, expect, it, vi } from "vitest";

import { WORKERS_AI_MODEL } from "@/server/ai/constants";
import { WorkersAiStructuredClient } from "@/server/ai/workers-ai-client";

describe("WorkersAiStructuredClient", () => {
  it("maps the neutral client request to the Workers AI binding", async () => {
    const run = vi.fn().mockResolvedValue({ response: "{}" });
    const client = new WorkersAiStructuredClient(run);
    const request = {
      messages: [
        { role: "system" as const, content: "system" },
        { role: "user" as const, content: "user" },
      ],
      responseFormat: {
        type: "json_schema" as const,
        jsonSchema: { type: "object" },
      },
      maxTokens: 400,
      temperature: 0,
    };

    await expect(client.generate(request)).resolves.toEqual({ response: "{}" });
    expect(run).toHaveBeenCalledWith(WORKERS_AI_MODEL, {
      messages: request.messages,
      response_format: {
        type: "json_schema",
        json_schema: request.responseFormat.jsonSchema,
      },
      stream: false,
      max_tokens: 400,
      temperature: 0,
    });
  });
});

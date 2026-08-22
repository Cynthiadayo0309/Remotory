import { getCloudflareContext } from "@opennextjs/cloudflare";

import { createWorkersAiClient } from "@/server/ai/workers-ai-client";
import type { StructuredAiClient } from "@/server/ai/types";

export function getAiClient(): StructuredAiClient {
  return createWorkersAiClient(getCloudflareContext().env.AI);
}

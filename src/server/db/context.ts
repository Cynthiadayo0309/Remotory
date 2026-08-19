import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getDatabase(): D1Database {
  return getCloudflareContext().env.DB;
}

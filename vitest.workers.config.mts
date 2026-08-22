import { fileURLToPath } from "node:url";

import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    cloudflareTest(() => ({
      miniflare: {
        compatibilityDate: "2026-08-19",
        compatibilityFlags: ["nodejs_compat"],
      },
    })),
  ],
  test: {
    include: ["tests/integration/workers/**/*.test.ts"],
  },
});

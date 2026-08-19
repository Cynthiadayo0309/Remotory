import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { withAdminAuth } from "@/server/auth";
import { config, middleware } from "@/middleware";

afterEach(() => vi.unstubAllEnvs());

describe("admin auth boundaries", () => {
  it("matches admin pages and admin APIs only", () => {
    expect(config.matcher).toEqual(["/admin/:path*", "/api/admin/:path*"]);
  });

  it.each(["/admin", "/admin/companies", "/api/admin/session"])(
    "returns 403 without valid authentication for %s",
    async (pathname) => {
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv("CLOUDFLARE_ACCESS_TEAM_DOMAIN", "");
      vi.stubEnv("CLOUDFLARE_ACCESS_AUD", "");
      vi.stubEnv("REMOTORY_ADMIN_EMAIL", "");
      const response = await middleware(
        new NextRequest(`https://example.com${pathname}`),
      );
      expect(response.status).toBe(403);
      expect(response.headers.get("cache-control")).toBe("no-store");
    },
  );

  it("allows the explicit development-only bypass", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("REMOTORY_AUTH_DEV_BYPASS", "true");
    const response = await middleware(
      new NextRequest("http://localhost:3000/admin"),
    );
    expect(response.status).toBe(200);
  });

  it("provides a reusable 403 guard for admin route handlers", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const protectedHandler = withAdminAuth(() => Response.json({ ok: true }));
    const response = await protectedHandler(
      new Request("https://example.com/api/admin/example"),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "forbidden" });
  });
});

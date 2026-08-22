import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { withAdminAuth } from "@/server/auth";
import { config, middleware } from "@/middleware";
import { POST as createCompany } from "@/app/api/admin/companies/route";
import { PATCH as updateCompany } from "@/app/api/admin/companies/[id]/route";
import { POST as createSource } from "@/app/api/admin/companies/[id]/sources/route";
import { PATCH as updateSource } from "@/app/api/admin/companies/[id]/sources/[sourceId]/route";
import { POST as reviewCandidate } from "@/app/api/admin/reviews/[id]/route";
import {
  GET as getUpdateRun,
  POST as startUpdateRun,
} from "@/app/api/admin/update-runs/route";

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

  it.each([
    [
      "company create",
      createCompany,
      "https://example.com/api/admin/companies",
      "POST",
    ],
    [
      "company update",
      updateCompany,
      "https://example.com/api/admin/companies/00000000-0000-4000-8000-000000000000",
      "PATCH",
    ],
    [
      "source create",
      createSource,
      "https://example.com/api/admin/companies/00000000-0000-4000-8000-000000000000/sources",
      "POST",
    ],
    [
      "source update",
      updateSource,
      "https://example.com/api/admin/companies/00000000-0000-4000-8000-000000000000/sources/00000000-0000-4000-8000-000000000001",
      "PATCH",
    ],
    [
      "candidate review",
      reviewCandidate,
      "https://example.com/api/admin/reviews/00000000-0000-4000-8000-000000000002",
      "POST",
    ],
    [
      "company update start",
      startUpdateRun,
      "https://example.com/api/admin/update-runs",
      "POST",
    ],
    [
      "company update status",
      getUpdateRun,
      "https://example.com/api/admin/update-runs",
      "GET",
    ],
  ])(
    "protects the %s endpoint independently",
    async (_, handler, url, method) => {
      vi.stubEnv("NODE_ENV", "test");
      const response = await handler(new Request(url, { method }));
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "forbidden" });
    },
  );
});

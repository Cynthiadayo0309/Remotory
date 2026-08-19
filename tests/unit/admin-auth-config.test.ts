import { describe, expect, it } from "vitest";

import { resolveAdminAuthConfig } from "@/server/auth/config";

const validEnvironment = {
  NODE_ENV: "production",
  CLOUDFLARE_ACCESS_TEAM_DOMAIN: "https://remotory.cloudflareaccess.com",
  CLOUDFLARE_ACCESS_AUD: "test-audience",
  REMOTORY_ADMIN_EMAIL: "Admin@Example.com",
};

describe("admin auth configuration", () => {
  it("normalizes valid Cloudflare Access configuration", () => {
    expect(resolveAdminAuthConfig(validEnvironment)).toEqual({
      ok: true,
      config: {
        mode: "cloudflare-access",
        access: {
          teamDomain: "https://remotory.cloudflareaccess.com",
          audience: "test-audience",
          adminEmail: "admin@example.com",
        },
      },
    });
  });

  it("allows bypass only when development and explicitly enabled", () => {
    expect(
      resolveAdminAuthConfig({
        NODE_ENV: "development",
        REMOTORY_AUTH_DEV_BYPASS: "true",
      }),
    ).toMatchObject({
      ok: true,
      config: { mode: "development-bypass" },
    });

    expect(
      resolveAdminAuthConfig({
        ...validEnvironment,
        REMOTORY_AUTH_DEV_BYPASS: "true",
      }),
    ).toMatchObject({
      ok: true,
      config: { mode: "cloudflare-access" },
    });
  });

  it.each([
    "http://remotory.cloudflareaccess.com",
    "https://remotory.cloudflareaccess.com/path",
    "https://remotory.cloudflareaccess.com.example.com",
  ])("rejects an unsafe team domain: %s", (teamDomain) => {
    expect(
      resolveAdminAuthConfig({
        ...validEnvironment,
        CLOUDFLARE_ACCESS_TEAM_DOMAIN: teamDomain,
      }),
    ).toEqual({ ok: false, reason: "invalid-configuration" });
  });
});

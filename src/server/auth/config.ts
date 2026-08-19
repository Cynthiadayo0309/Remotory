import { z } from "zod";

export interface AuthEnvironment {
  NODE_ENV?: string;
  CLOUDFLARE_ACCESS_TEAM_DOMAIN?: string;
  CLOUDFLARE_ACCESS_AUD?: string;
  REMOTORY_ADMIN_EMAIL?: string;
  REMOTORY_AUTH_DEV_BYPASS?: string;
}

export interface CloudflareAccessConfig {
  teamDomain: string;
  audience: string;
  adminEmail: string;
}

export type AdminAuthConfig =
  | { mode: "cloudflare-access"; access: CloudflareAccessConfig }
  | { mode: "development-bypass"; adminEmail: string };

export type AdminAuthConfigResult =
  | { ok: true; config: AdminAuthConfig }
  | { ok: false; reason: "invalid-configuration" };

const teamDomainSchema = z
  .string()
  .trim()
  .url()
  .superRefine((value, context) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      context.addIssue({ code: "custom", message: "Invalid team domain URL" });
      return;
    }
    const isCloudflareAccessDomain =
      url.hostname.endsWith(".cloudflareaccess.com") &&
      url.hostname !== "cloudflareaccess.com";
    if (
      url.protocol !== "https:" ||
      !isCloudflareAccessDomain ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      context.addIssue({
        code: "custom",
        message: "Invalid Cloudflare Access team domain",
      });
    }
  })
  .transform((value) => new URL(value).origin);

const cloudflareAccessConfigSchema = z.object({
  teamDomain: teamDomainSchema,
  audience: z.string().trim().min(1).max(512),
  adminEmail: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
});

export function resolveAdminAuthConfig(
  environment: AuthEnvironment,
): AdminAuthConfigResult {
  if (
    environment.NODE_ENV === "development" &&
    environment.REMOTORY_AUTH_DEV_BYPASS === "true"
  ) {
    return {
      ok: true,
      config: {
        mode: "development-bypass",
        adminEmail: "local-admin@remotory.test",
      },
    };
  }

  const result = cloudflareAccessConfigSchema.safeParse({
    teamDomain: environment.CLOUDFLARE_ACCESS_TEAM_DOMAIN,
    audience: environment.CLOUDFLARE_ACCESS_AUD,
    adminEmail: environment.REMOTORY_ADMIN_EMAIL,
  });
  if (!result.success) return { ok: false, reason: "invalid-configuration" };

  return {
    ok: true,
    config: { mode: "cloudflare-access", access: result.data },
  };
}

export function getAuthEnvironment(): AuthEnvironment {
  return {
    NODE_ENV: process.env.NODE_ENV,
    CLOUDFLARE_ACCESS_TEAM_DOMAIN: process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN,
    CLOUDFLARE_ACCESS_AUD: process.env.CLOUDFLARE_ACCESS_AUD,
    REMOTORY_ADMIN_EMAIL: process.env.REMOTORY_ADMIN_EMAIL,
    REMOTORY_AUTH_DEV_BYPASS: process.env.REMOTORY_AUTH_DEV_BYPASS,
  };
}

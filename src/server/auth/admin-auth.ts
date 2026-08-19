import type { JWTVerifyGetKey } from "jose";

import {
  getAuthEnvironment,
  resolveAdminAuthConfig,
  type AuthEnvironment,
} from "@/server/auth/config";
import { verifyCloudflareAccessJwt } from "@/server/auth/cloudflare-access";

export interface AdminSession {
  email: string;
  subject: string;
  authMode: "cloudflare-access" | "development-bypass";
  expiresAt: number | null;
}

export type AdminAuthFailureReason =
  | "invalid-configuration"
  | "missing-token"
  | "invalid-token"
  | "email-not-allowed";

export type AdminAuthResult =
  | { ok: true; session: AdminSession }
  | { ok: false; reason: AdminAuthFailureReason };

export interface AdminAuthDependencies {
  keySet?: JWTVerifyGetKey;
}

export async function authenticateAdmin(
  headers: Headers,
  environment: AuthEnvironment = getAuthEnvironment(),
  dependencies: AdminAuthDependencies = {},
): Promise<AdminAuthResult> {
  const configResult = resolveAdminAuthConfig(environment);
  if (!configResult.ok) return configResult;

  if (configResult.config.mode === "development-bypass") {
    return {
      ok: true,
      session: {
        email: configResult.config.adminEmail,
        subject: "development-bypass",
        authMode: "development-bypass",
        expiresAt: null,
      },
    };
  }

  const token = headers.get("cf-access-jwt-assertion");
  if (!token) return { ok: false, reason: "missing-token" };

  try {
    const identity = await verifyCloudflareAccessJwt(
      token,
      configResult.config.access,
      dependencies.keySet,
    );
    if (identity.email !== configResult.config.access.adminEmail) {
      return { ok: false, reason: "email-not-allowed" };
    }

    return {
      ok: true,
      session: {
        ...identity,
        authMode: "cloudflare-access",
      },
    };
  } catch {
    return { ok: false, reason: "invalid-token" };
  }
}

import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";

import type { CloudflareAccessConfig } from "@/server/auth/config";

const MAX_ACCESS_TOKEN_LENGTH = 16_384;
const remoteKeySets = new Map<string, JWTVerifyGetKey>();

export interface VerifiedAccessIdentity {
  email: string;
  subject: string;
  expiresAt: number;
}

function getRemoteKeySet(teamDomain: string): JWTVerifyGetKey {
  const existing = remoteKeySets.get(teamDomain);
  if (existing) return existing;

  const keySet = createRemoteJWKSet(
    new URL(`${teamDomain}/cdn-cgi/access/certs`),
  );
  remoteKeySets.set(teamDomain, keySet);
  return keySet;
}

function identityFromPayload(payload: JWTPayload): VerifiedAccessIdentity {
  if (
    typeof payload.email !== "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("Cloudflare Access JWT is missing identity claims");
  }

  return {
    email: payload.email.trim().toLowerCase(),
    subject: payload.sub,
    expiresAt: payload.exp,
  };
}

export async function verifyCloudflareAccessJwt(
  token: string,
  config: CloudflareAccessConfig,
  keySet: JWTVerifyGetKey = getRemoteKeySet(config.teamDomain),
): Promise<VerifiedAccessIdentity> {
  if (!token || token.length > MAX_ACCESS_TOKEN_LENGTH) {
    throw new Error("Invalid Cloudflare Access JWT size");
  }

  const { payload } = await jwtVerify(token, keySet, {
    algorithms: ["RS256"],
    issuer: config.teamDomain,
    audience: config.audience,
    requiredClaims: ["iss", "aud", "exp", "sub", "email"],
  });

  return identityFromPayload(payload);
}

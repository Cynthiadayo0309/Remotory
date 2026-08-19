// @vitest-environment node

import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type CryptoKey,
  type JWTVerifyGetKey,
} from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { authenticateAdmin } from "@/server/auth";
import type { AuthEnvironment } from "@/server/auth/config";

const issuer = "https://remotory.cloudflareaccess.com";
const audience = "remotory-admin-audience";
const adminEmail = "admin@example.com";
const productionEnvironment: AuthEnvironment = {
  NODE_ENV: "production",
  CLOUDFLARE_ACCESS_TEAM_DOMAIN: issuer,
  CLOUDFLARE_ACCESS_AUD: audience,
  REMOTORY_ADMIN_EMAIL: adminEmail,
};

let privateKey: CryptoKey;
let localKeySet: JWTVerifyGetKey;

beforeAll(async () => {
  const keyPair = await generateKeyPair("RS256");
  privateKey = keyPair.privateKey;
  const publicJwk = await exportJWK(keyPair.publicKey);
  publicJwk.kid = "test-key";
  publicJwk.alg = "RS256";
  localKeySet = createLocalJWKSet({ keys: [publicJwk] });
});

async function createToken({
  email = adminEmail,
  tokenIssuer = issuer,
  tokenAudience = audience,
  expiration = "5m",
}: {
  email?: string;
  tokenIssuer?: string;
  tokenAudience?: string;
  expiration?: string | number;
} = {}) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(tokenIssuer)
    .setAudience(tokenAudience)
    .setSubject("access-user-id")
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(privateKey);
}

function assertionHeaders(token?: string): Headers {
  return new Headers(token ? { "Cf-Access-Jwt-Assertion": token } : undefined);
}

describe("Cloudflare Access admin authentication", () => {
  it("accepts a correctly signed admin token", async () => {
    const result = await authenticateAdmin(
      assertionHeaders(await createToken()),
      productionEnvironment,
      { keySet: localKeySet },
    );

    expect(result).toMatchObject({
      ok: true,
      session: {
        email: adminEmail,
        subject: "access-user-id",
        authMode: "cloudflare-access",
      },
    });
  });

  it("rejects missing assertions and a different administrator email", async () => {
    expect(
      await authenticateAdmin(new Headers(), productionEnvironment, {
        keySet: localKeySet,
      }),
    ).toEqual({ ok: false, reason: "missing-token" });

    expect(
      await authenticateAdmin(
        assertionHeaders(await createToken({ email: "other@example.com" })),
        productionEnvironment,
        { keySet: localKeySet },
      ),
    ).toEqual({ ok: false, reason: "email-not-allowed" });
  });

  it.each([
    { label: "issuer", tokenIssuer: "https://other.cloudflareaccess.com" },
    { label: "audience", tokenAudience: "wrong-audience" },
    { label: "expiration", expiration: 1 },
  ])("rejects an invalid $label claim", async (overrides) => {
    const result = await authenticateAdmin(
      assertionHeaders(await createToken(overrides)),
      productionEnvironment,
      { keySet: localKeySet },
    );
    expect(result).toEqual({ ok: false, reason: "invalid-token" });
  });

  it("rejects a token signed by an untrusted key", async () => {
    const otherKeyPair = await generateKeyPair("RS256");
    const token = await new SignJWT({ email: adminEmail })
      .setProtectedHeader({ alg: "RS256", kid: "other-key" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject("access-user-id")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(otherKeyPair.privateKey);

    expect(
      await authenticateAdmin(assertionHeaders(token), productionEnvironment, {
        keySet: localKeySet,
      }),
    ).toEqual({ ok: false, reason: "invalid-token" });
  });

  it("rejects a token without an expiration claim", async () => {
    const token = await new SignJWT({ email: adminEmail })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject("access-user-id")
      .setIssuedAt()
      .sign(privateKey);

    expect(
      await authenticateAdmin(assertionHeaders(token), productionEnvironment, {
        keySet: localKeySet,
      }),
    ).toEqual({ ok: false, reason: "invalid-token" });
  });
});

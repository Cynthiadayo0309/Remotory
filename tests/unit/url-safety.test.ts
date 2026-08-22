import { describe, expect, it, vi } from "vitest";

import { validateExternalUrl } from "@/server/fetch/url-safety";

const publicResolver = vi.fn(async () => ["93.184.216.34"]);

describe("external URL safety", () => {
  it("allows an http/https URL only after public DNS validation", async () => {
    const result = await validateExternalUrl(
      "https://example.com/careers#jobs",
      publicResolver,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.url.href).toBe("https://example.com/careers");
  });

  it.each([
    ["ftp://example.com/file", "UNSUPPORTED_PROTOCOL"],
    ["https://user:pass@example.com", "UNSAFE_URL"],
    ["https://example.com:8443", "UNSAFE_URL"],
    ["http://localhost", "BLOCKED_HOST"],
    ["http://localhost.", "BLOCKED_HOST"],
    ["http://service.local", "BLOCKED_HOST"],
    ["http://app.internal", "BLOCKED_HOST"],
    ["http://router.home.arpa", "BLOCKED_HOST"],
    ["http://127.1", "BLOCKED_IP"],
    ["http://2130706433", "BLOCKED_IP"],
    ["http://[::1]", "BLOCKED_IP"],
    ["http://[::ffff:127.0.0.1]", "BLOCKED_IP"],
  ])("rejects %s as %s", async (url, code) => {
    const result = await validateExternalUrl(url, publicResolver);
    expect(result).toMatchObject({ ok: false, failure: { code } });
  });

  it("rejects an invalid URL", async () => {
    const result = await validateExternalUrl("not a url", publicResolver);
    expect(result).toMatchObject({
      ok: false,
      failure: { code: "INVALID_URL" },
    });
  });

  it("rejects DNS results containing any private address", async () => {
    const result = await validateExternalUrl(
      "https://mixed.example",
      async () => ["93.184.216.34", "10.0.0.8"],
    );
    expect(result).toMatchObject({
      ok: false,
      failure: { code: "BLOCKED_IP", retryable: false },
    });
  });

  it("classifies DNS failures as retryable", async () => {
    const result = await validateExternalUrl(
      "https://missing.example",
      async () => {
        throw new Error("DNS failed");
      },
    );
    expect(result).toMatchObject({
      ok: false,
      failure: { code: "DNS_LOOKUP_FAILED", retryable: true },
    });
  });
});

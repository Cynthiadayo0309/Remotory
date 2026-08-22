import { describe, expect, it } from "vitest";

import { sha256Text } from "@/server/fetch/hash";
import {
  decodePageBytes,
  normalizePageDocument,
} from "@/server/fetch/normalize";

describe("Workers page normalization", () => {
  it("removes executable markup and normalizes Japanese text", async () => {
    const html = `<!doctype html><html><body>
      <h1>Ｒｅｍｏｔｅ&nbsp;採用</h1>
      <script>secret-token</script><style>.hidden { color: red; }</style>
      <p>全国 &amp; 一部地域</p>
    </body></html>`;
    const normalized = await normalizePageDocument(
      new TextEncoder().encode(html),
      "text/html; charset=utf-8",
    );
    expect(normalized).toContain("Remote 採用");
    expect(normalized).toContain("全国 & 一部地域");
    expect(normalized).not.toContain("secret-token");
    expect(normalized).not.toContain("color: red");
  });

  it("normalizes plain text whitespace", async () => {
    await expect(
      normalizePageDocument(
        new TextEncoder().encode("  フルリモート\r\n\r\n\r\n  募集中  "),
        "text/plain; charset=utf-8",
      ),
    ).resolves.toBe("フルリモート\n\n募集中");
  });

  it("rejects an unsupported charset", () => {
    expect(() =>
      decodePageBytes(
        new Uint8Array([0xff]),
        "text/html; charset=unsupported-charset",
      ),
    ).toThrow();
  });

  it("produces deterministic SHA-256 hashes", async () => {
    const first = await sha256Text("同じ本文");
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    await expect(sha256Text("同じ本文")).resolves.toBe(first);
    await expect(sha256Text("変更後の本文")).resolves.not.toBe(first);
  });
});

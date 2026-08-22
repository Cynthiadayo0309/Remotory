import { describe, expect, it, vi } from "vitest";

import { fetchPage } from "@/server/fetch/fetch-page";
import type { PageFetchDependencies } from "@/server/fetch/types";

const HASH = "a".repeat(64);

function dependencies(
  fetchImplementation: typeof fetch,
  overrides: Partial<PageFetchDependencies> = {},
): PageFetchDependencies {
  return {
    fetch: fetchImplementation,
    resolveHostname: async () => ["93.184.216.34"],
    normalizeDocument: async (bytes) => new TextDecoder().decode(bytes).trim(),
    hashText: async () => HASH,
    ...overrides,
  };
}

function mockFetch(responses: Response[]): typeof fetch {
  const queue = [...responses];
  return vi.fn(
    async () => queue.shift() ?? new Response("unexpected"),
  ) as unknown as typeof fetch;
}

describe("page fetch", () => {
  it("returns normalized content without forwarding sensitive headers", async () => {
    const fetchImplementation = mockFetch([
      new Response("  採用情報  ", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
    ]);
    const result = await fetchPage(
      "https://example.com/careers#open",
      dependencies(fetchImplementation),
    );
    expect(result).toMatchObject({
      ok: true,
      requestedUrl: "https://example.com/careers",
      finalUrl: "https://example.com/careers",
      redirectCount: 0,
      normalizedText: "採用情報",
      contentHash: HASH,
    });
    const requestInit = vi.mocked(fetchImplementation).mock.calls[0]?.[1];
    const headers = new Headers(requestInit?.headers);
    expect(requestInit).toMatchObject({
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      credentials: "omit",
    });
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.has("Cookie")).toBe(false);
    expect(headers.has("Cf-Access-Jwt-Assertion")).toBe(false);
  });

  it("follows a relative redirect after validating the new host", async () => {
    const resolver = vi.fn(async () => ["93.184.216.34"]);
    const result = await fetchPage(
      "https://example.com/start",
      dependencies(
        mockFetch([
          new Response(null, { status: 302, headers: { Location: "/jobs" } }),
          new Response("jobs", {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          }),
        ]),
        { resolveHostname: resolver },
      ),
    );
    expect(result).toMatchObject({
      ok: true,
      finalUrl: "https://example.com/jobs",
      redirectCount: 1,
    });
    expect(resolver).toHaveBeenCalledTimes(2);
  });

  it("blocks a redirect to a private address before the second fetch", async () => {
    const fetchImplementation = mockFetch([
      new Response(null, {
        status: 302,
        headers: { Location: "http://127.0.0.1/admin" },
      }),
    ]);
    const result = await fetchPage(
      "https://example.com/start",
      dependencies(fetchImplementation),
    );
    expect(result).toMatchObject({ ok: false, code: "BLOCKED_IP" });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("rejects missing redirect locations and redirects above the limit", async () => {
    await expect(
      fetchPage(
        "https://example.com/start",
        dependencies(mockFetch([new Response(null, { status: 302 })])),
      ),
    ).resolves.toMatchObject({ ok: false, code: "REDIRECT_INVALID" });

    await expect(
      fetchPage(
        "https://example.com/start",
        dependencies(
          mockFetch([
            new Response(null, {
              status: 302,
              headers: { Location: "/one" },
            }),
            new Response(null, {
              status: 302,
              headers: { Location: "/two" },
            }),
          ]),
        ),
        { maxRedirects: 1 },
      ),
    ).resolves.toMatchObject({ ok: false, code: "REDIRECT_LIMIT" });
  });

  it("enforces declared and streamed body limits", async () => {
    await expect(
      fetchPage(
        "https://example.com/exact",
        dependencies(
          mockFetch([
            new Response("1234567890", {
              headers: { "Content-Type": "text/plain" },
            }),
          ]),
        ),
        { maxBytes: 10 },
      ),
    ).resolves.toMatchObject({ ok: true, byteLength: 10 });

    await expect(
      fetchPage(
        "https://example.com/large",
        dependencies(
          mockFetch([
            new Response("small", {
              headers: {
                "Content-Type": "text/plain",
                "Content-Length": "11",
              },
            }),
          ]),
        ),
        { maxBytes: 10 },
      ),
    ).resolves.toMatchObject({ ok: false, code: "RESPONSE_TOO_LARGE" });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("123456"));
        controller.enqueue(new TextEncoder().encode("78901"));
        controller.close();
      },
    });
    await expect(
      fetchPage(
        "https://example.com/chunked",
        dependencies(
          mockFetch([
            new Response(stream, {
              headers: { "Content-Type": "text/plain" },
            }),
          ]),
        ),
        { maxBytes: 10 },
      ),
    ).resolves.toMatchObject({ ok: false, code: "RESPONSE_TOO_LARGE" });
  });

  it.each([
    [404, "PAGE_NOT_FOUND", false],
    [410, "PAGE_NOT_FOUND", false],
    [400, "HTTP_ERROR", false],
    [408, "HTTP_ERROR", true],
    [429, "HTTP_ERROR", true],
    [503, "HTTP_ERROR", true],
  ])("classifies HTTP %i", async (status, code, retryable) => {
    const result = await fetchPage(
      "https://example.com/status",
      dependencies(mockFetch([new Response(null, { status })])),
    );
    expect(result).toMatchObject({
      ok: false,
      code,
      retryable,
      httpStatus: status,
    });
  });

  it("rejects unsupported and empty content", async () => {
    await expect(
      fetchPage(
        "https://example.com/file.pdf",
        dependencies(
          mockFetch([
            new Response("pdf", {
              headers: { "Content-Type": "application/pdf" },
            }),
          ]),
        ),
      ),
    ).resolves.toMatchObject({ ok: false, code: "UNSUPPORTED_CONTENT_TYPE" });
    await expect(
      fetchPage(
        "https://example.com/empty",
        dependencies(
          mockFetch([
            new Response("   ", {
              headers: { "Content-Type": "text/plain" },
            }),
          ]),
        ),
      ),
    ).resolves.toMatchObject({ ok: false, code: "CONTENT_EMPTY" });
  });

  it("classifies decoding and network failures", async () => {
    await expect(
      fetchPage(
        "https://example.com/invalid-text",
        dependencies(
          mockFetch([
            new Response("body", {
              headers: { "Content-Type": "text/html" },
            }),
          ]),
          {
            normalizeDocument: async () => {
              throw new Error("decode failed");
            },
          },
        ),
      ),
    ).resolves.toMatchObject({ ok: false, code: "DECODE_FAILED" });

    const failedFetch = vi.fn(async () => {
      throw new Error("network failed");
    }) as unknown as typeof fetch;
    await expect(
      fetchPage("https://example.com/network", dependencies(failedFetch)),
    ).resolves.toMatchObject({
      ok: false,
      code: "FETCH_FAILED",
      retryable: true,
    });
  });

  it("returns timeout without retrying internally", async () => {
    const fetchImplementation = vi.fn(
      () => new Promise<Response>(() => undefined),
    ) as unknown as typeof fetch;
    const result = await fetchPage(
      "https://example.com/slow",
      dependencies(fetchImplementation),
      { timeoutMs: 5 },
    );
    expect(result).toMatchObject({
      ok: false,
      code: "TIMEOUT",
      retryable: true,
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });
});

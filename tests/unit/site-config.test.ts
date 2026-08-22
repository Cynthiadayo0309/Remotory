import { describe, expect, it } from "vitest";

import { createRobotsConfig } from "@/app/robots";
import { isSiteIndexingEnabled, resolveSiteUrl } from "@/config/site";

describe("site configuration", () => {
  it("accepts HTTPS origins and local HTTP origins only", () => {
    expect(resolveSiteUrl("https://preview.example.com").origin).toBe(
      "https://preview.example.com",
    );
    expect(resolveSiteUrl("http://127.0.0.1:3100").origin).toBe(
      "http://127.0.0.1:3100",
    );
    expect(resolveSiteUrl("http://public.example.com").origin).toBe(
      "http://localhost:3000",
    );
    expect(resolveSiteUrl("https://user@example.com/path").origin).toBe(
      "http://localhost:3000",
    );
  });

  it("requires an explicit flag and HTTPS before indexing", () => {
    expect(
      isSiteIndexingEnabled({
        REMOTORY_SITE_URL: "https://www.example.com",
        REMOTORY_ALLOW_INDEXING: "true",
      }),
    ).toBe(true);
    expect(
      isSiteIndexingEnabled({
        REMOTORY_SITE_URL: "http://localhost:3000",
        REMOTORY_ALLOW_INDEXING: "true",
      }),
    ).toBe(false);
    expect(
      isSiteIndexingEnabled({
        REMOTORY_SITE_URL: "https://www.example.com",
        REMOTORY_ALLOW_INDEXING: "false",
      }),
    ).toBe(false);
  });

  it("blocks preview crawling and excludes admin routes in production", () => {
    expect(
      createRobotsConfig({
        url: new URL("http://localhost:3000"),
        indexingEnabled: false,
      }),
    ).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(
      createRobotsConfig({
        url: new URL("https://www.example.com"),
        indexingEnabled: true,
      }),
    ).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/admin/"],
      },
      sitemap: "https://www.example.com/sitemap.xml",
    });
  });
});

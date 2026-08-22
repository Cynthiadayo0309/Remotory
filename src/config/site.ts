const LOCAL_SITE_URL = new URL("http://localhost:3000");

export interface SiteEnvironment {
  REMOTORY_SITE_URL?: string;
  REMOTORY_ALLOW_INDEXING?: string;
}

export function resolveSiteUrl(value?: string): URL {
  if (!value) return LOCAL_SITE_URL;
  try {
    const url = new URL(value);
    const isLocalHttp =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !isLocalHttp) ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      return LOCAL_SITE_URL;
    }
    return new URL(url.origin);
  } catch {
    return LOCAL_SITE_URL;
  }
}

export function isSiteIndexingEnabled(environment: SiteEnvironment): boolean {
  return (
    environment.REMOTORY_ALLOW_INDEXING === "true" &&
    resolveSiteUrl(environment.REMOTORY_SITE_URL).protocol === "https:"
  );
}

export const siteConfig = {
  name: "Remotory",
  description:
    "日本に拠点があり、フルリモート勤務が可能な企業を探せる企業ディレクトリです。",
  url: resolveSiteUrl(process.env.REMOTORY_SITE_URL),
  indexingEnabled: isSiteIndexingEnabled({
    REMOTORY_SITE_URL: process.env.REMOTORY_SITE_URL,
    REMOTORY_ALLOW_INDEXING: process.env.REMOTORY_ALLOW_INDEXING,
  }),
} as const;

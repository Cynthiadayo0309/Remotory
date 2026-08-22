import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export function createRobotsConfig(config: {
  url: URL;
  indexingEnabled: boolean;
}): MetadataRoute.Robots {
  if (!config.indexingEnabled) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/admin/"],
    },
    sitemap: new URL("/sitemap.xml", config.url).toString(),
  };
}

export default function robots(): MetadataRoute.Robots {
  return createRobotsConfig(siteConfig);
}

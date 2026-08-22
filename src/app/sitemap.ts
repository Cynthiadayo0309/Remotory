import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { getPublicCompanySitemapEntries } from "@/features/companies/server/public-company-queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const companies = await getPublicCompanySitemapEntries();
  const staticPages: MetadataRoute.Sitemap = [
    { url: new URL("/", siteConfig.url).toString(), priority: 1 },
    {
      url: new URL("/criteria", siteConfig.url).toString(),
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: new URL("/about", siteConfig.url).toString(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  return [
    ...staticPages,
    ...companies.map((company) => ({
      url: new URL(`/companies/${company.slug}`, siteConfig.url).toString(),
      lastModified: company.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}

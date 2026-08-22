import { createRepositories } from "@/server/db";
import { getDatabase } from "@/server/db/context";
import type { Company, CompanySource } from "@/types/company";

import {
  PUBLIC_COMPANY_PAGE_SIZE,
  type PublicCompanySearch,
} from "@/features/companies/public-company-search";

export interface PublicCompanyListing {
  companies: Company[];
  industries: string[];
  total: number;
  loadedPage: number;
  hasMore: boolean;
}

export async function getPublicCompanyListing(
  search: PublicCompanySearch,
): Promise<PublicCompanyListing> {
  const repositories = createRepositories(getDatabase());
  const filters = {
    keyword: search.keyword,
    recruitingStatus: search.recruitingStatus,
    workLocationScope: search.workLocationScope,
    industry: search.industry,
    publicationStatus: "published" as const,
  };

  const [total, industries] = await Promise.all([
    repositories.companies.count(filters),
    repositories.companies.listIndustries("published"),
  ]);
  const availablePages = Math.max(
    1,
    Math.ceil(total / PUBLIC_COMPANY_PAGE_SIZE),
  );
  const loadedPage = Math.min(search.page, availablePages);
  const pages = await Promise.all(
    Array.from({ length: loadedPage }, (_, page) =>
      repositories.companies.list({
        ...filters,
        limit: PUBLIC_COMPANY_PAGE_SIZE,
        offset: page * PUBLIC_COMPANY_PAGE_SIZE,
      }),
    ),
  );

  return {
    companies: pages.flat(),
    industries,
    total,
    loadedPage,
    hasMore: loadedPage < availablePages,
  };
}

export interface PublicCompanyDetail {
  company: Company;
  sources: CompanySource[];
}

export async function getPublicCompanyBySlug(
  slug: string,
): Promise<PublicCompanyDetail | null> {
  const repositories = createRepositories(getDatabase());
  const company = await repositories.companies.findPublishedBySlug(slug);

  if (!company) return null;

  const sources = await repositories.companySources.listActiveByCompany(
    company.id,
  );
  return {
    company,
    sources,
  };
}

export async function getPublicCompanySitemapEntries() {
  return createRepositories(
    getDatabase(),
  ).companies.listPublishedSitemapEntries();
}

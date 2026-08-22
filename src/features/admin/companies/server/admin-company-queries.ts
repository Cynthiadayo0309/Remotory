import {
  ADMIN_COMPANY_PAGE_SIZE,
  type AdminCompanySearch,
} from "@/features/admin/companies/admin-company-search";
import { createRepositories } from "@/server/db";
import { getDatabase } from "@/server/db/context";
import type { Company, CompanySource } from "@/types/company";

export interface AdminCompanyListing {
  companies: Company[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getAdminCompanyListing(
  search: AdminCompanySearch,
): Promise<AdminCompanyListing> {
  const repositories = createRepositories(getDatabase());
  const filters = {
    keyword: search.keyword,
    publicationStatus: search.publicationStatus,
    recruitingStatus: search.recruitingStatus,
  };
  const total = await repositories.companies.count(filters);
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_COMPANY_PAGE_SIZE));
  const page = Math.min(search.page, totalPages);
  const companies = await repositories.companies.list({
    ...filters,
    limit: ADMIN_COMPANY_PAGE_SIZE,
    offset: (page - 1) * ADMIN_COMPANY_PAGE_SIZE,
  });

  return { companies, total, page, totalPages };
}

export async function getAdminCompany(
  id: string,
): Promise<{ company: Company; sources: CompanySource[] } | null> {
  const repositories = createRepositories(getDatabase());
  const company = await repositories.companies.findById(id);
  if (!company) return null;
  return {
    company,
    sources: await repositories.companySources.listByCompany(company.id),
  };
}

export async function getAdminDashboard() {
  const repositories = createRepositories(getDatabase());
  const [
    total,
    published,
    needsReview,
    hidden,
    pendingCandidates,
    recent,
    latestUpdateRun,
  ] = await Promise.all([
    repositories.companies.count(),
    repositories.companies.count({ publicationStatus: "published" }),
    repositories.companies.count({ publicationStatus: "needs_review" }),
    repositories.companies.count({ publicationStatus: "hidden" }),
    repositories.companyChangeCandidates.countByReviewStatus("pending"),
    repositories.companies.listRecentlyUpdated(5),
    repositories.companyUpdateRuns.findLatest(),
  ]);

  return {
    total,
    published,
    needsReview,
    hidden,
    pendingCandidates,
    recent,
    latestUpdateRun,
  };
}

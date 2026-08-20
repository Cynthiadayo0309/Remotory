import { z } from "zod";

import {
  publicationStatuses,
  recruitingStatuses,
  type PublicationStatus,
  type RecruitingStatus,
} from "@/types/company";

export const ADMIN_COMPANY_PAGE_SIZE = 20;

type SearchParamValue = string | string[] | undefined;
export type AdminCompanySearchParams = Record<string, SearchParamValue>;

export interface AdminCompanySearch {
  keyword?: string;
  publicationStatus?: PublicationStatus;
  recruitingStatus?: RecruitingStatus;
  needsReviewOnly: boolean;
  page: number;
}

const schema = z.object({
  keyword: z.string().trim().min(1).max(200).optional().catch(undefined),
  publicationStatus: z.enum(publicationStatuses).optional().catch(undefined),
  recruitingStatus: z.enum(recruitingStatuses).optional().catch(undefined),
  needsReviewOnly: z.enum(["1", "0"]).catch("0"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

function first(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAdminCompanySearchParams(
  params: AdminCompanySearchParams,
): AdminCompanySearch {
  const value = schema.parse({
    keyword: first(params.q),
    publicationStatus: first(params.publication),
    recruitingStatus: first(params.recruiting),
    needsReviewOnly: first(params.needsReview) ?? "0",
    page: first(params.page) ?? 1,
  });
  const needsReviewOnly = value.needsReviewOnly === "1";

  return {
    keyword: value.keyword,
    publicationStatus: needsReviewOnly
      ? "needs_review"
      : value.publicationStatus,
    recruitingStatus: value.recruitingStatus,
    needsReviewOnly,
    page: value.page,
  };
}

export function buildAdminCompanyHref(
  search: AdminCompanySearch,
  page: number,
): string {
  const params = new URLSearchParams();
  if (search.keyword) params.set("q", search.keyword);
  if (search.publicationStatus && !search.needsReviewOnly) {
    params.set("publication", search.publicationStatus);
  }
  if (search.recruitingStatus) {
    params.set("recruiting", search.recruitingStatus);
  }
  if (search.needsReviewOnly) params.set("needsReview", "1");
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/companies?${query}` : "/admin/companies";
}

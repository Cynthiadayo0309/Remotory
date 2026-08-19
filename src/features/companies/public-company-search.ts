import { z } from "zod";

import {
  recruitingStatuses,
  workLocationScopes,
  type RecruitingStatus,
  type WorkLocationScope,
} from "@/types/company";

export const PUBLIC_COMPANY_PAGE_SIZE = 20;

export interface PublicCompanySearch {
  keyword?: string;
  recruitingStatus?: RecruitingStatus;
  workLocationScope?: WorkLocationScope;
  industry?: string;
  page: number;
}

type SearchParamValue = string | string[] | undefined;
export type PublicSearchParams = Record<string, SearchParamValue>;

const optionalText = (max: number) =>
  z.string().trim().min(1).max(max).optional().catch(undefined);

const searchSchema = z.object({
  keyword: optionalText(200),
  recruitingStatus: z.enum(recruitingStatuses).optional().catch(undefined),
  workLocationScope: z.enum(workLocationScopes).optional().catch(undefined),
  industry: optionalText(100),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

function firstValue(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePublicCompanySearchParams(
  params: PublicSearchParams,
): PublicCompanySearch {
  return searchSchema.parse({
    keyword: firstValue(params.q),
    recruitingStatus: firstValue(params.recruiting),
    workLocationScope: firstValue(params.location),
    industry: firstValue(params.industry),
    page: firstValue(params.page) ?? 1,
  });
}

export function buildPublicCompanySearchHref(
  search: PublicCompanySearch,
  page: number,
): string {
  const params = new URLSearchParams();
  if (search.keyword) params.set("q", search.keyword);
  if (search.recruitingStatus)
    params.set("recruiting", search.recruitingStatus);
  if (search.workLocationScope)
    params.set("location", search.workLocationScope);
  if (search.industry) params.set("industry", search.industry);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

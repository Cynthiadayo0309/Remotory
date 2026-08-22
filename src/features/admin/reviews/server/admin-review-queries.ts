import { createRepositories } from "@/server/db";
import { getDatabase } from "@/server/db/context";
import type { Company, CompanyChangeCandidate } from "@/types/company";

export interface AdminReviewGroup {
  company: Company;
  candidates: CompanyChangeCandidate[];
}

export async function getAdminReviewGroups(): Promise<AdminReviewGroup[]> {
  const repositories = createRepositories(getDatabase());
  const candidates =
    await repositories.companyChangeCandidates.listByReviewStatus("pending");
  const companyIds = [...new Set(candidates.map(({ companyId }) => companyId))];
  const companies = await Promise.all(
    companyIds.map((id) => repositories.companies.findById(id)),
  );
  const companyMap = new Map(
    companies
      .filter((company): company is Company => company !== null)
      .map((company) => [company.id, company]),
  );

  return companyIds.flatMap((companyId) => {
    const company = companyMap.get(companyId);
    if (!company) return [];
    return [
      {
        company,
        candidates: candidates.filter(
          (candidate) => candidate.companyId === companyId,
        ),
      },
    ];
  });
}

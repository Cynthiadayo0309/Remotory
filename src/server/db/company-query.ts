import type { D1BindingValue } from "@/server/db/repository-dependencies";
import type {
  PublicationStatus,
  RecruitingStatus,
  WorkLocationScope,
} from "@/types/company";

export interface CompanyQueryFilters {
  keyword?: string;
  publicationStatus?: PublicationStatus;
  recruitingStatus?: RecruitingStatus;
  workLocationScope?: WorkLocationScope;
  industry?: string;
}

export function buildCompanyWhere(filters: CompanyQueryFilters): {
  where: string;
  parameters: D1BindingValue[];
} {
  const conditions: string[] = [];
  const parameters: D1BindingValue[] = [];

  const addCondition = (sql: string, parameter: D1BindingValue) => {
    parameters.push(parameter);
    conditions.push(sql.replace("?", `?${parameters.length}`));
  };

  if (filters.keyword) {
    const keyword = `%${filters.keyword}%`;
    parameters.push(keyword, keyword, keyword);
    const start = parameters.length - 2;
    conditions.push(
      `(name LIKE ?${start} OR description LIKE ?${start + 1} OR industry LIKE ?${start + 2})`,
    );
  }
  if (filters.publicationStatus) {
    addCondition("publication_status = ?", filters.publicationStatus);
  }
  if (filters.recruitingStatus) {
    addCondition("recruiting_status = ?", filters.recruitingStatus);
  }
  if (filters.workLocationScope) {
    addCondition("work_location_scope = ?", filters.workLocationScope);
  }
  if (filters.industry) {
    addCondition("industry = ?", filters.industry);
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    parameters,
  };
}

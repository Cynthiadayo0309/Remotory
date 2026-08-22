import {
  officeRequirementLabels,
  remoteScopeLabels,
  workLocationScopeLabels,
} from "@/features/companies/presentation";
import type { ChangeCandidateField, Company } from "@/types/company";
import {
  officeRequirements,
  recruitingStatuses,
  remoteScopes,
  workLocationScopes,
} from "@/types/company";

export const candidateFieldLabels: Record<ChangeCandidateField, string> = {
  remote_scope: "フルリモート対象範囲",
  work_location_scope: "勤務可能地域",
  work_location_note: "地域制限の詳細",
  office_required: "出社有無",
  office_note: "出社条件",
  recruiting_status: "募集状況",
};

const recruitingStatusLabels = {
  open: "募集中",
  closed: "募集なし",
  unknown: "不明",
} as const;

function includesValue<T extends string>(
  values: readonly T[],
  value: string,
): value is T {
  return values.some((item) => item === value);
}

export function getCompanyCandidateValue(
  company: Company,
  field: ChangeCandidateField,
): string | null {
  switch (field) {
    case "remote_scope":
      return company.remoteScope;
    case "work_location_scope":
      return company.workLocationScope;
    case "work_location_note":
      return company.workLocationNote;
    case "office_required":
      return company.officeRequired;
    case "office_note":
      return company.officeNote;
    case "recruiting_status":
      return company.recruitingStatus;
  }
}

export function formatCandidateValue(
  field: ChangeCandidateField,
  value: string | null,
): string {
  if (value === null || value === "") return "設定なし";

  if (field === "remote_scope" && includesValue(remoteScopes, value)) {
    return remoteScopeLabels[value];
  }
  if (
    field === "work_location_scope" &&
    includesValue(workLocationScopes, value)
  ) {
    return workLocationScopeLabels[value];
  }
  if (field === "office_required" && includesValue(officeRequirements, value)) {
    return officeRequirementLabels[value];
  }
  if (
    field === "recruiting_status" &&
    includesValue(recruitingStatuses, value)
  ) {
    return recruitingStatusLabels[value];
  }
  return value;
}

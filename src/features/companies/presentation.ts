import type {
  OfficeRequirement,
  RecruitingStatus,
  RemoteScope,
  SourceType,
  WorkLocationScope,
} from "@/types/company";

export const recruitingStatusLabels: Record<RecruitingStatus, string> = {
  open: "募集中",
  closed: "現在募集なし",
  unknown: "募集状況を確認中",
};

export const workLocationScopeLabels: Record<WorkLocationScope, string> = {
  nationwide: "全国から勤務可",
  restricted: "勤務地域に制限あり",
  unknown: "勤務地域を確認中",
};

export const remoteScopeLabels: Record<RemoteScope, string> = {
  all: "全ポジション",
  partial: "一部ポジション",
  unknown: "対象範囲を確認中",
};

export const officeRequirementLabels: Record<OfficeRequirement, string> = {
  yes: "出社あり",
  no: "原則出社なし",
  unknown: "出社条件を確認中",
};

export const sourceTypeLabels: Record<SourceType, string> = {
  official: "公式サイト",
  recruit: "公式採用サイト",
  jobs: "求人情報",
  workstyle: "働き方情報",
  other: "その他の情報源",
};

export function formatVerifiedDate(value: string | null): string {
  if (!value) return "確認中";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

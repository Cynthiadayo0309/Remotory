import type {
  PublicationStatus,
  RecruitingStatus,
  SourceType,
} from "@/types/company";

export const publicationStatusLabels: Record<PublicationStatus, string> = {
  published: "公開中",
  needs_review: "要確認",
  hidden: "掲載停止",
};

export const adminRecruitingStatusLabels: Record<RecruitingStatus, string> = {
  open: "募集中",
  closed: "募集なし",
  unknown: "不明",
};

export const adminSourceTypeLabels: Record<SourceType, string> = {
  official: "公式サイト",
  recruit: "公式採用サイト",
  jobs: "公式求人一覧",
  workstyle: "働き方・制度",
  other: "その他",
};

export function formatAdminDate(value: string | null): string {
  if (!value) return "未確認";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

import type { CompanyUpdateRunStatus } from "@/types/update-run";

export const updateRunStatusLabels: Record<CompanyUpdateRunStatus, string> = {
  queued: "開始待ち",
  running: "実行中",
  completed: "完了",
  failed: "失敗",
};

export function formatUpdateRunDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

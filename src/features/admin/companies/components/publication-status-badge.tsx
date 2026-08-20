import { publicationStatusLabels } from "@/features/admin/companies/admin-presentation";
import type { PublicationStatus } from "@/types/company";

const classes: Record<PublicationStatus, string> = {
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  needs_review: "border-amber-200 bg-amber-50 text-amber-900",
  hidden: "border-zinc-200 bg-zinc-100 text-zinc-700",
};

export function PublicationStatusBadge({
  status,
}: {
  status: PublicationStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[status]}`}
    >
      {publicationStatusLabels[status]}
    </span>
  );
}

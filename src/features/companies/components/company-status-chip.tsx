import { Chip } from "@heroui/react";

import {
  recruitingStatusLabels,
  workLocationScopeLabels,
} from "@/features/companies/presentation";
import type { RecruitingStatus, WorkLocationScope } from "@/types/company";

export function RecruitingStatusChip({ status }: { status: RecruitingStatus }) {
  const color =
    status === "open" ? "success" : status === "closed" ? "default" : "warning";
  return (
    <Chip color={color} size="sm" variant="soft">
      {recruitingStatusLabels[status]}
    </Chip>
  );
}

export function WorkLocationChip({ scope }: { scope: WorkLocationScope }) {
  return (
    <Chip color="accent" size="sm" variant="soft">
      {workLocationScopeLabels[scope]}
    </Chip>
  );
}

import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { CompanyUpdateWorkflowParams } from "@/server/workflows/company-update-workflow";

export function getCompanyUpdateWorkflow(): Workflow<CompanyUpdateWorkflowParams> | null {
  const workflow = getCloudflareContext().env.COMPANY_UPDATE_WORKFLOW;
  return workflow && typeof workflow.create === "function" ? workflow : null;
}

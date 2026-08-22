import { adminJson, handleAdminApiError } from "@/features/admin/api-response";
import { startCompanyUpdateRun } from "@/features/admin/update-runs/server/admin-update-run-mutations";
import { getLatestCompanyUpdateRun } from "@/features/admin/update-runs/server/admin-update-run-queries";
import { withAdminAuth } from "@/server/auth";

export const GET = withAdminAuth(async () => {
  try {
    return adminJson({ run: await getLatestCompanyUpdateRun() });
  } catch (error) {
    return handleAdminApiError(error);
  }
});

export const POST = withAdminAuth(async () => {
  try {
    const result = await startCompanyUpdateRun();
    if (!result.ok) {
      const message = {
        already_running: "一括確認はすでに実行中です",
        no_published_companies: "公開中の企業がありません",
        workflow_unavailable:
          "Workflow bindingが利用できません。ローカルではWorker previewを使用してください",
      }[result.reason];
      return adminJson(
        { error: result.reason, message },
        { status: result.reason === "workflow_unavailable" ? 503 : 409 },
      );
    }
    return adminJson({ run: result.run }, { status: 202 });
  } catch (error) {
    return handleAdminApiError(error);
  }
});

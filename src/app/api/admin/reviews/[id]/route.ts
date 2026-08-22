import {
  adminJson,
  handleAdminApiError,
  readAdminJson,
} from "@/features/admin/api-response";
import { reviewAdminChangeCandidate } from "@/features/admin/reviews/server/admin-review-mutations";
import { withAdminAuth } from "@/server/auth";

export const POST = withAdminAuth(async (request) => {
  try {
    const id = new URL(request.url).pathname.split("/").at(-1) ?? "";
    const result = await reviewAdminChangeCandidate(
      id,
      await readAdminJson(request),
    );

    if (!result.ok) {
      if (result.reason === "not_found") {
        return adminJson({ error: "not_found" }, { status: 404 });
      }
      if (result.reason === "already_reviewed") {
        return adminJson(
          {
            error: "already_reviewed",
            message: "この候補はすでにレビュー済みです。",
          },
          { status: 409 },
        );
      }
      return adminJson(
        {
          error: "stale_value",
          message:
            "企業情報が候補作成後に変更されています。現在値を確認し、必要なら候補を却下してください。",
        },
        { status: 409 },
      );
    }

    return adminJson({
      candidate: result.candidate,
      company: result.company,
    });
  } catch (error) {
    return handleAdminApiError(error);
  }
});

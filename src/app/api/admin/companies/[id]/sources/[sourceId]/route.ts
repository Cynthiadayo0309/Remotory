import {
  adminJson,
  handleAdminApiError,
  readAdminJson,
} from "@/features/admin/api-response";
import { updateAdminCompanySource } from "@/features/admin/companies/server/admin-company-mutations";
import { withAdminAuth } from "@/server/auth";

export const PATCH = withAdminAuth(async (request) => {
  try {
    const segments = new URL(request.url).pathname.split("/");
    const companyId = segments.at(-3) ?? "";
    const sourceId = segments.at(-1) ?? "";
    const source = await updateAdminCompanySource(
      companyId,
      sourceId,
      await readAdminJson(request),
    );
    if (!source) return adminJson({ error: "not_found" }, { status: 404 });
    return adminJson({ source });
  } catch (error) {
    return handleAdminApiError(error);
  }
});

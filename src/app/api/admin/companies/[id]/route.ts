import {
  adminJson,
  handleAdminApiError,
  readAdminJson,
} from "@/features/admin/api-response";
import { updateAdminCompany } from "@/features/admin/companies/server/admin-company-mutations";
import { withAdminAuth } from "@/server/auth";

export const PATCH = withAdminAuth(async (request) => {
  try {
    const id = new URL(request.url).pathname.split("/").at(-1) ?? "";
    const company = await updateAdminCompany(id, await readAdminJson(request));
    if (!company) return adminJson({ error: "not_found" }, { status: 404 });
    return adminJson({ company });
  } catch (error) {
    return handleAdminApiError(error);
  }
});

import {
  adminJson,
  handleAdminApiError,
  readAdminJson,
} from "@/features/admin/api-response";
import { createAdminCompanySource } from "@/features/admin/companies/server/admin-company-mutations";
import { withAdminAuth } from "@/server/auth";

export const POST = withAdminAuth(async (request) => {
  try {
    const segments = new URL(request.url).pathname.split("/");
    const companyId = segments.at(-2) ?? "";
    const source = await createAdminCompanySource(
      companyId,
      await readAdminJson(request),
    );
    if (!source) return adminJson({ error: "not_found" }, { status: 404 });
    return adminJson({ source }, { status: 201 });
  } catch (error) {
    return handleAdminApiError(error);
  }
});

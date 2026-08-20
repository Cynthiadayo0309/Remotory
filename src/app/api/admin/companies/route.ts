import {
  adminJson,
  handleAdminApiError,
  readAdminJson,
} from "@/features/admin/api-response";
import { createAdminCompany } from "@/features/admin/companies/server/admin-company-mutations";
import { withAdminAuth } from "@/server/auth";

export const POST = withAdminAuth(async (request) => {
  try {
    const company = await createAdminCompany(await readAdminJson(request));
    return adminJson({ company }, { status: 201 });
  } catch (error) {
    return handleAdminApiError(error);
  }
});

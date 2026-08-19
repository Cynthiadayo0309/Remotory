import { authenticateAdmin, type AdminSession } from "@/server/auth/admin-auth";
import { createAdminForbiddenResponse } from "@/server/auth/responses";

export type AdminRouteHandler = (
  request: Request,
  session: AdminSession,
) => Response | Promise<Response>;

export function withAdminAuth(handler: AdminRouteHandler) {
  return async function protectedAdminRoute(
    request: Request,
  ): Promise<Response> {
    const result = await authenticateAdmin(request.headers);
    if (!result.ok) {
      return createAdminForbiddenResponse(
        new URL(request.url).pathname,
        result.reason,
      );
    }
    return handler(request, result.session);
  };
}

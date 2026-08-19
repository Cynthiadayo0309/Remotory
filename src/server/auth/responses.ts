import type { AdminAuthFailureReason } from "@/server/auth/admin-auth";

const FORBIDDEN_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function createAdminForbiddenResponse(
  pathname: string,
  reason: AdminAuthFailureReason,
): Response {
  void reason;
  if (pathname === "/api/admin" || pathname.startsWith("/api/admin/")) {
    return Response.json(
      { error: "forbidden" },
      { status: 403, headers: FORBIDDEN_HEADERS },
    );
  }

  return new Response("Forbidden", {
    status: 403,
    headers: {
      ...FORBIDDEN_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

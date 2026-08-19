import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authenticateAdmin } from "@/server/auth";
import { createAdminForbiddenResponse } from "@/server/auth/responses";

export async function middleware(request: NextRequest) {
  const result = await authenticateAdmin(request.headers);
  if (!result.ok) {
    return createAdminForbiddenResponse(
      request.nextUrl.pathname,
      result.reason,
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

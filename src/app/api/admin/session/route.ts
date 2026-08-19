import { withAdminAuth } from "@/server/auth";

export const dynamic = "force-dynamic";

export const GET = withAdminAuth((_request, session) =>
  Response.json(
    {
      email: session.email,
      authMode: session.authMode,
      expiresAt: session.expiresAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  ),
);

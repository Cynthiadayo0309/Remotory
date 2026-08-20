import { ZodError } from "zod";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function adminJson(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, {
    ...init,
    headers: { ...JSON_HEADERS, ...init?.headers },
  });
}

export async function readAdminJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ZodError([
      {
        code: "custom",
        path: [],
        message: "JSON形式の入力が必要です",
      },
    ]);
  }
}

export function handleAdminApiError(error: unknown): Response {
  if (error instanceof ZodError) {
    return adminJson(
      { error: "validation_error", issues: error.issues },
      { status: 400 },
    );
  }
  if (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed")
  ) {
    return adminJson(
      { error: "conflict", message: "同じ値がすでに登録されています" },
      { status: 409 },
    );
  }
  return adminJson({ error: "internal_error" }, { status: 500 });
}

import type { PageFetchFailure } from "@/server/fetch/types";

export async function cancelResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // The response is already closed; there is no body left to release.
  }
}

function tooLarge(response: Response): PageFetchFailure {
  return {
    ok: false,
    code: "RESPONSE_TOO_LARGE",
    retryable: false,
    detail: "レスポンスが最大サイズを超えています",
    httpStatus: response.status,
  };
}

export async function readLimitedResponseBody(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array | PageFetchFailure> {
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      await cancelResponseBody(response);
      return tooLarge(response);
    }
  }
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return tooLarge(response);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

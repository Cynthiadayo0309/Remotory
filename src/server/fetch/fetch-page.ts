import {
  ALLOWED_PAGE_CONTENT_TYPES,
  PAGE_FETCH_ACCEPT,
  PAGE_FETCH_MAX_BYTES,
  PAGE_FETCH_MAX_REDIRECTS,
  PAGE_FETCH_TIMEOUT_MS,
  PAGE_FETCH_USER_AGENT,
} from "@/server/fetch/constants";
import { sha256Text } from "@/server/fetch/hash";
import { normalizePageDocument } from "@/server/fetch/normalize";
import {
  cancelResponseBody,
  readLimitedResponseBody,
} from "@/server/fetch/response-body";
import type {
  PageFetchDependencies,
  PageFetchFailure,
  PageFetchOptions,
  PageFetchResult,
} from "@/server/fetch/types";
import { validateExternalUrl } from "@/server/fetch/url-safety";
import { resolveWorkerHostname } from "@/server/fetch/workers-runtime";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const defaultDependencies: PageFetchDependencies = {
  fetch: globalThis.fetch.bind(globalThis),
  resolveHostname: resolveWorkerHostname,
  normalizeDocument: normalizePageDocument,
  hashText: sha256Text,
};

function failure(
  code: PageFetchFailure["code"],
  retryable: boolean,
  detail: string,
  httpStatus?: number,
): PageFetchFailure {
  return {
    ok: false,
    code,
    retryable,
    detail,
    ...(httpStatus === undefined ? {} : { httpStatus }),
  };
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

export async function fetchPage(
  input: string,
  dependencies: PageFetchDependencies = defaultDependencies,
  options: PageFetchOptions = {},
): Promise<PageFetchResult> {
  const timeoutMs = options.timeoutMs ?? PAGE_FETCH_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? PAGE_FETCH_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? PAGE_FETCH_MAX_REDIRECTS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let safeUrl = await withAbort(
      validateExternalUrl(input, dependencies.resolveHostname),
      controller.signal,
    );
    if (!safeUrl.ok) return safeUrl.failure;
    const requestedUrl = safeUrl.url.href;
    let currentUrl = safeUrl.url;
    let redirectCount = 0;

    while (true) {
      const response = await withAbort(
        dependencies.fetch(currentUrl, {
          method: "GET",
          redirect: "manual",
          cache: "no-store",
          credentials: "omit",
          signal: controller.signal,
          headers: {
            Accept: PAGE_FETCH_ACCEPT,
            "Accept-Language": "ja,en;q=0.8",
            "User-Agent": PAGE_FETCH_USER_AGENT,
          },
        }),
        controller.signal,
      );

      if (REDIRECT_STATUSES.has(response.status)) {
        if (redirectCount >= maxRedirects) {
          await cancelResponseBody(response);
          return failure(
            "REDIRECT_LIMIT",
            false,
            "リダイレクト上限を超えました",
            response.status,
          );
        }
        const location = response.headers.get("location");
        await cancelResponseBody(response);
        if (!location) {
          return failure(
            "REDIRECT_INVALID",
            false,
            "リダイレクト先がありません",
            response.status,
          );
        }
        let redirectUrl: URL;
        try {
          redirectUrl = new URL(location, currentUrl);
        } catch {
          return failure(
            "REDIRECT_INVALID",
            false,
            "リダイレクト先を解析できません",
            response.status,
          );
        }
        safeUrl = await withAbort(
          validateExternalUrl(redirectUrl, dependencies.resolveHostname),
          controller.signal,
        );
        if (!safeUrl.ok) return safeUrl.failure;
        currentUrl = safeUrl.url;
        redirectCount += 1;
        continue;
      }

      if (response.status === 404 || response.status === 410) {
        await cancelResponseBody(response);
        return failure(
          "PAGE_NOT_FOUND",
          false,
          "ページが見つかりません",
          response.status,
        );
      }
      if (!response.ok) {
        await cancelResponseBody(response);
        const retryable =
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500;
        return failure(
          "HTTP_ERROR",
          retryable,
          "取得先がエラーステータスを返しました",
          response.status,
        );
      }

      const contentTypeHeader = response.headers.get("content-type") ?? "";
      const contentType = contentTypeHeader
        .split(";", 1)[0]!
        .trim()
        .toLowerCase();
      if (!ALLOWED_PAGE_CONTENT_TYPES.has(contentType)) {
        await cancelResponseBody(response);
        return failure(
          "UNSUPPORTED_CONTENT_TYPE",
          false,
          "対応していないContent-Typeです",
          response.status,
        );
      }

      const body = await withAbort(
        readLimitedResponseBody(response, maxBytes),
        controller.signal,
      );
      if (!(body instanceof Uint8Array)) return body;

      let normalizedText: string;
      try {
        normalizedText = await withAbort(
          dependencies.normalizeDocument(body, contentTypeHeader),
          controller.signal,
        );
      } catch {
        if (controller.signal.aborted)
          throw new DOMException("Aborted", "AbortError");
        return failure(
          "DECODE_FAILED",
          false,
          "ページ本文をデコードできません",
          response.status,
        );
      }
      if (!normalizedText) {
        return failure(
          "CONTENT_EMPTY",
          false,
          "有効な本文を取得できませんでした",
          response.status,
        );
      }

      return {
        ok: true,
        requestedUrl,
        finalUrl: currentUrl.href,
        httpStatus: response.status,
        contentType,
        byteLength: body.byteLength,
        redirectCount,
        normalizedText,
        contentHash: await withAbort(
          dependencies.hashText(normalizedText),
          controller.signal,
        ),
      };
    }
  } catch {
    if (controller.signal.aborted) {
      return failure("TIMEOUT", true, "取得がタイムアウトしました");
    }
    return failure("FETCH_FAILED", true, "ページ取得に失敗しました");
  } finally {
    clearTimeout(timeout);
  }
}

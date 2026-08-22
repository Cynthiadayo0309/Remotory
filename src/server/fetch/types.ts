export const pageFetchErrorCodes = [
  "INVALID_URL",
  "UNSUPPORTED_PROTOCOL",
  "UNSAFE_URL",
  "BLOCKED_HOST",
  "BLOCKED_IP",
  "DNS_LOOKUP_FAILED",
  "TIMEOUT",
  "REDIRECT_INVALID",
  "REDIRECT_LIMIT",
  "PAGE_NOT_FOUND",
  "HTTP_ERROR",
  "UNSUPPORTED_CONTENT_TYPE",
  "RESPONSE_TOO_LARGE",
  "CONTENT_EMPTY",
  "DECODE_FAILED",
  "FETCH_FAILED",
] as const;

export type PageFetchErrorCode = (typeof pageFetchErrorCodes)[number];

export interface PageFetchSuccess {
  ok: true;
  requestedUrl: string;
  finalUrl: string;
  httpStatus: number;
  contentType: string;
  byteLength: number;
  redirectCount: number;
  normalizedText: string;
  contentHash: string;
}

export interface PageFetchFailure {
  ok: false;
  code: PageFetchErrorCode;
  retryable: boolean;
  detail: string;
  httpStatus?: number;
}

export type PageFetchResult = PageFetchSuccess | PageFetchFailure;

export type HostnameResolver = (hostname: string) => Promise<string[]>;

export interface PageFetchDependencies {
  fetch: typeof fetch;
  resolveHostname: HostnameResolver;
  normalizeDocument: (
    bytes: Uint8Array,
    contentTypeHeader: string,
  ) => Promise<string>;
  hashText: (value: string) => Promise<string>;
}

export interface PageFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

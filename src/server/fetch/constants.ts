export const PAGE_FETCH_TIMEOUT_MS = 15_000;
export const PAGE_FETCH_MAX_BYTES = 2 * 1024 * 1024;
export const PAGE_FETCH_MAX_REDIRECTS = 5;
export const SOURCE_FAILURE_REVIEW_THRESHOLD = 3;
export const SOURCE_STALE_MONTHS = 6;

export const PAGE_FETCH_ACCEPT =
  "text/html,application/xhtml+xml,text/plain;q=0.8";
export const PAGE_FETCH_USER_AGENT = "RemotoryBot/0.1";

export const ALLOWED_PAGE_CONTENT_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "text/plain",
]);

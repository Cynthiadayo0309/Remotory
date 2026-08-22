import { isIpAddress, isPublicIpAddress } from "@/server/fetch/ip-address";
import type { HostnameResolver, PageFetchFailure } from "@/server/fetch/types";

const BLOCKED_HOST_SUFFIXES = [
  "localhost",
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
];

export type SafeUrlResult =
  { ok: true; url: URL } | { ok: false; failure: PageFetchFailure };

function failure(
  code: PageFetchFailure["code"],
  detail: string,
): SafeUrlResult {
  return { ok: false, failure: { ok: false, code, retryable: false, detail } };
}

export async function validateExternalUrl(
  input: string | URL,
  resolveHostname: HostnameResolver,
): Promise<SafeUrlResult> {
  let url: URL;
  try {
    url = input instanceof URL ? new URL(input) : new URL(input);
  } catch {
    return failure("INVALID_URL", "URLを解析できません");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return failure("UNSUPPORTED_PROTOCOL", "http/https以外は取得できません");
  }
  if (url.username || url.password) {
    return failure("UNSAFE_URL", "認証情報を含むURLは取得できません");
  }
  const allowedPort =
    !url.port ||
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443");
  if (!allowedPort) {
    return failure("UNSAFE_URL", "標準ポート以外は取得できません");
  }

  const hostname = url.hostname
    .replace(/^\[|\]$/g, "")
    .toLowerCase()
    .replace(/\.+$/, "");
  if (
    !hostname ||
    BLOCKED_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(suffix),
    )
  ) {
    return failure("BLOCKED_HOST", "ローカルホスト名は取得できません");
  }

  if (isIpAddress(hostname)) {
    if (!isPublicIpAddress(hostname)) {
      return failure("BLOCKED_IP", "公開IP以外は取得できません");
    }
  } else {
    let addresses: string[];
    try {
      addresses = await resolveHostname(hostname);
    } catch {
      return {
        ok: false,
        failure: {
          ok: false,
          code: "DNS_LOOKUP_FAILED",
          retryable: true,
          detail: "DNS解決に失敗しました",
        },
      };
    }
    if (addresses.length === 0) {
      return {
        ok: false,
        failure: {
          ok: false,
          code: "DNS_LOOKUP_FAILED",
          retryable: true,
          detail: "公開アドレスを解決できませんでした",
        },
      };
    }
    if (addresses.some((address) => !isPublicIpAddress(address))) {
      return failure("BLOCKED_IP", "DNS結果に公開IP以外が含まれています");
    }
  }

  url.hash = "";
  return { ok: true, url };
}

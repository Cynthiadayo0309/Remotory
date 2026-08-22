import { resolve4, resolve6 } from "node:dns/promises";

import type { HostnameResolver } from "@/server/fetch/types";

export const resolveWorkerHostname: HostnameResolver = async (hostname) => {
  const results = await Promise.allSettled([
    resolve4(hostname),
    resolve6(hostname),
  ]);
  const addresses = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const unexpectedFailure = results.find(
    (result) =>
      result.status === "rejected" &&
      !["ENODATA", "ENOTFOUND"].includes(
        String((result.reason as { code?: unknown })?.code ?? ""),
      ),
  );
  if (unexpectedFailure) {
    throw new Error("DNS lookup failed");
  }
  if (addresses.length === 0) {
    throw new Error("DNS lookup returned no addresses");
  }
  return [...new Set(addresses)];
};

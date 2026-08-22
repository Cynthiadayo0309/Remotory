import type { NextConfig } from "next";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  agentRules: false,
  reactStrictMode: true,
};

export default nextConfig;

initOpenNextCloudflareForDev({
  remoteBindings: process.env.REMOTORY_ENABLE_REMOTE_BINDINGS === "true",
});

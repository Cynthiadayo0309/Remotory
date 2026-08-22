import type { Metadata } from "next";
import type { ReactNode } from "react";

import { siteConfig } from "@/config/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteConfig.url,
  applicationName: siteConfig.name,
  title: {
    default: "Remotory | フルリモートで働ける企業を探す",
    template: "%s | Remotory",
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: siteConfig.name,
    title: "Remotory | フルリモートで働ける企業を探す",
    description: siteConfig.description,
  },
  robots: {
    index: siteConfig.indexingEnabled,
    follow: siteConfig.indexingEnabled,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className="h-full bg-zinc-50 antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}

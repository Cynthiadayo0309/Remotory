import type { Metadata } from "next";

import { AdminHeader } from "@/components/admin/admin-header";

export const metadata: Metadata = {
  title: { default: "管理画面 | Remotory", template: "%s | Remotory Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader />
      {children}
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理画面 | Remotory",
  robots: { index: false, follow: false },
};

export default function AdminBoundaryPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-5 py-16 sm:px-8">
      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-sm font-semibold tracking-[0.14em] text-blue-700 uppercase">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          Remotory 管理画面
        </h1>
        <p className="mt-5 leading-8 text-zinc-600">
          Cloudflare
          Accessによる管理者認証が有効です。ダッシュボードと企業管理機能はStep
          5で実装します。
        </p>
      </section>
    </main>
  );
}

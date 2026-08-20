import Link from "next/link";

import { formatAdminDate } from "@/features/admin/companies/admin-presentation";
import { getAdminDashboard } from "@/features/admin/companies/server/admin-company-queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboard();
  const stats = [
    { label: "登録企業数", value: dashboard.total },
    { label: "公開中", value: dashboard.published },
    { label: "要確認", value: dashboard.needsReview },
    { label: "掲載停止", value: dashboard.hidden },
    { label: "変更候補", value: dashboard.pendingCandidates },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-blue-700 uppercase">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            管理ダッシュボード
          </h1>
          <p className="mt-3 text-zinc-600">
            公開状態と確認が必要な企業を把握できます。
          </p>
        </div>
        <Link
          href="/admin/companies/new"
          className="inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          企業を登録
        </Link>
      </div>

      <section
        aria-label="企業の集計"
        className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">
              {stat.value.toLocaleString("ja-JP")}
            </p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-zinc-950">最近の更新</h2>
            <Link
              href="/admin/companies"
              className="text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              企業一覧へ
            </Link>
          </div>
          {dashboard.recent.length > 0 ? (
            <ul className="mt-5 divide-y divide-zinc-200">
              {dashboard.recent.map((company) => (
                <li
                  key={company.id}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <Link
                      href={`/admin/companies/${company.id}/edit`}
                      className="font-semibold text-zinc-950 hover:text-blue-700"
                    >
                      {company.name}
                    </Link>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatAdminDate(company.updatedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-zinc-600">登録企業はまだありません。</p>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">一括確認</h2>
          <dl className="mt-5 space-y-3">
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-zinc-500">前回実行日時</dt>
              <dd className="font-medium text-zinc-900">未実行</dd>
            </div>
          </dl>
          <button
            type="button"
            disabled
            className="mt-6 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-xl bg-zinc-200 px-4 font-semibold text-zinc-500"
            aria-describedby="bulk-update-note"
          >
            全企業の情報を更新
          </button>
          <p
            id="bulk-update-note"
            className="mt-3 text-sm leading-6 text-zinc-500"
          >
            ページ取得基盤とWorkflowを実装するStep 6〜9で有効になります。
          </p>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";

import {
  adminRecruitingStatusLabels,
  formatAdminDate,
  publicationStatusLabels,
} from "@/features/admin/companies/admin-presentation";
import {
  buildAdminCompanyHref,
  parseAdminCompanySearchParams,
  type AdminCompanySearchParams,
} from "@/features/admin/companies/admin-company-search";
import { PublicationStatusBadge } from "@/features/admin/companies/components/publication-status-badge";
import { getAdminCompanyListing } from "@/features/admin/companies/server/admin-company-queries";
import {
  officeRequirementLabels,
  remoteScopeLabels,
  workLocationScopeLabels,
} from "@/features/companies/presentation";
import { publicationStatuses, recruitingStatuses } from "@/types/company";

export const dynamic = "force-dynamic";

const inputClass =
  "min-h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<AdminCompanySearchParams>;
}) {
  const search = parseAdminCompanySearchParams(await searchParams);
  const listing = await getAdminCompanyListing(search);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14"
    >
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-blue-700 uppercase">
            Companies
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            企業管理
          </h1>
          <p className="mt-3 text-zinc-600">
            登録情報、公開状態、根拠URLを管理します。
          </p>
        </div>
        <Link
          href="/admin/companies/new"
          className="inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          企業を登録
        </Link>
      </div>

      <form
        action="/admin/companies"
        className="mt-8 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]"
      >
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          企業名
          <input
            name="q"
            defaultValue={search.keyword}
            placeholder="企業名で検索"
            className={inputClass}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          公開状態
          <select
            name="publication"
            defaultValue={
              search.needsReviewOnly ? "" : search.publicationStatus
            }
            className={inputClass}
          >
            <option value="">すべて</option>
            {publicationStatuses.map((status) => (
              <option key={status} value={status}>
                {publicationStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          募集状況
          <select
            name="recruiting"
            defaultValue={search.recruitingStatus}
            className={inputClass}
          >
            <option value="">すべて</option>
            {recruitingStatuses.map((status) => (
              <option key={status} value={status}>
                {adminRecruitingStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-zinc-700">
            <input
              type="checkbox"
              name="needsReview"
              value="1"
              defaultChecked={search.needsReviewOnly}
              className="size-4 accent-blue-700"
            />
            要確認のみ
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-xl border border-zinc-300 bg-zinc-950 px-5 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            絞り込む
          </button>
        </div>
      </form>

      <div className="mt-7 flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-600">
          <span className="font-semibold text-zinc-950">
            {listing.total.toLocaleString("ja-JP")}
          </span>{" "}
          社
        </p>
        {(search.keyword ||
          search.publicationStatus ||
          search.recruitingStatus) && (
          <Link
            href="/admin/companies"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            条件をクリア
          </Link>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              {[
                "企業名",
                "リモート対象",
                "勤務地域",
                "出社",
                "募集状況",
                "公開状態",
                "最終確認日",
                "操作",
              ].map((label) => (
                <th key={label} scope="col" className="px-4 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {listing.companies.map((company) => (
              <tr key={company.id} className="align-top">
                <th
                  scope="row"
                  className="px-4 py-4 font-semibold text-zinc-950"
                >
                  {company.name}
                  <span className="mt-1 block font-normal text-zinc-500">
                    {company.slug}
                  </span>
                </th>
                <td className="px-4 py-4 text-zinc-700">
                  {remoteScopeLabels[company.remoteScope]}
                </td>
                <td className="px-4 py-4 text-zinc-700">
                  {workLocationScopeLabels[company.workLocationScope]}
                </td>
                <td className="px-4 py-4 text-zinc-700">
                  {officeRequirementLabels[company.officeRequired]}
                </td>
                <td className="px-4 py-4 text-zinc-700">
                  {adminRecruitingStatusLabels[company.recruitingStatus]}
                </td>
                <td className="px-4 py-4">
                  <PublicationStatusBadge status={company.publicationStatus} />
                </td>
                <td className="px-4 py-4 text-zinc-700">
                  {formatAdminDate(company.lastVerifiedAt)}
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/admin/companies/${company.id}/edit`}
                    className="font-semibold text-blue-700 hover:text-blue-900"
                  >
                    編集
                  </Link>
                </td>
              </tr>
            ))}
            {listing.companies.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-12 text-center text-zinc-600"
                >
                  条件に合う企業はありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {listing.totalPages > 1 && (
        <nav
          aria-label="企業一覧のページ"
          className="mt-6 flex items-center justify-center gap-4"
        >
          {listing.page > 1 ? (
            <Link
              href={buildAdminCompanyHref(search, listing.page - 1)}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 font-semibold text-zinc-800 hover:border-blue-300"
            >
              前へ
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-zinc-600">
            {listing.page} / {listing.totalPages} ページ
          </span>
          {listing.page < listing.totalPages ? (
            <Link
              href={buildAdminCompanyHref(search, listing.page + 1)}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 font-semibold text-zinc-800 hover:border-blue-300"
            >
              次へ
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}

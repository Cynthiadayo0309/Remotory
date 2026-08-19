import Link from "next/link";

import {
  recruitingStatusLabels,
  workLocationScopeLabels,
} from "@/features/companies/presentation";
import type { PublicCompanySearch } from "@/features/companies/public-company-search";
import { recruitingStatuses, workLocationScopes } from "@/types/company";

const fieldClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export function CompanySearchForm({
  search,
  industries,
}: {
  search: PublicCompanySearch;
  industries: string[];
}) {
  return (
    <form
      action="/"
      method="get"
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-zinc-700 lg:col-span-4">
          キーワード
          <input
            className={fieldClassName}
            defaultValue={search.keyword}
            name="q"
            placeholder="企業名・概要・業種から検索"
            type="search"
          />
        </label>
        <label className="text-sm font-medium text-zinc-700">
          募集状況
          <select
            className={fieldClassName}
            defaultValue={search.recruitingStatus ?? ""}
            name="recruiting"
          >
            <option value="">すべて</option>
            {recruitingStatuses.map((status) => (
              <option key={status} value={status}>
                {recruitingStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-zinc-700">
          勤務地域
          <select
            className={fieldClassName}
            defaultValue={search.workLocationScope ?? ""}
            name="location"
          >
            <option value="">すべて</option>
            {workLocationScopes.map((scope) => (
              <option key={scope} value={scope}>
                {workLocationScopeLabels[scope]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-zinc-700">
          業種
          <select
            className={fieldClassName}
            defaultValue={search.industry ?? ""}
            name="industry"
          >
            <option value="">すべて</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-3">
          <button
            type="submit"
            className="min-h-12 flex-1 rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            検索する
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center rounded-xl px-2 text-sm font-medium text-zinc-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            クリア
          </Link>
        </div>
      </div>
    </form>
  );
}

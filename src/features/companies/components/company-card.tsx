import Link from "next/link";

import {
  formatVerifiedDate,
  officeRequirementLabels,
  remoteScopeLabels,
} from "@/features/companies/presentation";
import type { Company } from "@/types/company";

import { RecruitingStatusChip, WorkLocationChip } from "./company-status-chip";

export function CompanyCard({ company }: { company: Company }) {
  const officeCondition = company.officeNote
    ? `${officeRequirementLabels[company.officeRequired]}（${company.officeNote}）`
    : officeRequirementLabels[company.officeRequired];

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500">
            {company.industry ?? "業種を確認中"}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">
            <Link
              href={`/companies/${company.slug}`}
              className="rounded hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              {company.name}
            </Link>
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <RecruitingStatusChip status={company.recruitingStatus} />
          <WorkLocationChip scope={company.workLocationScope} />
        </div>
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-5 border-t border-zinc-100 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-sm text-zinc-500">フルリモート対象</dt>
          <dd className="mt-1 font-medium text-zinc-900">
            {remoteScopeLabels[company.remoteScope]}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500">出社条件</dt>
          <dd className="mt-1 font-medium text-zinc-900">{officeCondition}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500">最終確認日</dt>
          <dd className="mt-1 font-medium text-zinc-900">
            {formatVerifiedDate(company.lastVerifiedAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 border-t border-zinc-100 pt-5">
        <Link
          href={`/companies/${company.slug}`}
          className="inline-flex min-h-10 items-center rounded-lg font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          詳細を見る
          <span aria-hidden="true" className="ml-2">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}

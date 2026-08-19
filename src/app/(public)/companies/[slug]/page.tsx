import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  RecruitingStatusChip,
  WorkLocationChip,
} from "@/features/companies/components/company-status-chip";
import {
  formatVerifiedDate,
  officeRequirementLabels,
  remoteScopeLabels,
  sourceTypeLabels,
  workLocationScopeLabels,
} from "@/features/companies/presentation";
import { getPublicCompanyBySlug } from "@/features/companies/server/public-company-queries";

export const dynamic = "force-dynamic";

type CompanyPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: CompanyPageProps): Promise<Metadata> {
  const detail = await getPublicCompanyBySlug((await params).slug);
  if (!detail) return { title: "企業が見つかりません | Remotory" };
  return {
    title: `${detail.company.name} | Remotory`,
    description:
      detail.company.description ??
      `${detail.company.name}のフルリモート勤務条件と募集状況`,
  };
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-zinc-200 py-5 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="text-sm font-medium text-zinc-500">{label}</dt>
      <dd className="mt-2 leading-7 text-zinc-900">{children}</dd>
    </div>
  );
}

export default async function CompanyDetailPage({ params }: CompanyPageProps) {
  const detail = await getPublicCompanyBySlug((await params).slug);
  if (!detail) notFound();

  const { company, sources } = detail;
  const officeCondition = company.officeNote
    ? `${officeRequirementLabels[company.officeRequired]}（${company.officeNote}）`
    : officeRequirementLabels[company.officeRequired];
  const location = company.workLocationNote
    ? `${workLocationScopeLabels[company.workLocationScope]}（${company.workLocationNote}）`
    : workLocationScopeLabels[company.workLocationScope];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <Link
        href="/"
        className="inline-flex min-h-10 items-center rounded-lg text-sm font-medium text-zinc-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <span aria-hidden="true" className="mr-2">
          ←
        </span>
        企業一覧へ戻る
      </Link>

      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-8">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-9">
            <p className="text-sm font-medium text-zinc-500">
              {company.industry ?? "業種を確認中"}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              {company.name}
            </h1>
            <div className="mt-6 flex flex-wrap gap-2">
              <RecruitingStatusChip status={company.recruitingStatus} />
              <WorkLocationChip scope={company.workLocationScope} />
            </div>
            <p className="mt-7 leading-8 text-zinc-700">
              {company.description ?? "企業概要を確認中です。"}
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-9">
            <h2 className="text-xl font-semibold text-zinc-950">勤務条件</h2>
            <dl className="mt-6">
              <DetailItem label="フルリモート対象範囲">
                {remoteScopeLabels[company.remoteScope]}
              </DetailItem>
              <DetailItem label="勤務地域・地域制限">{location}</DetailItem>
              <DetailItem label="出社有無・出社条件">
                {officeCondition}
              </DetailItem>
              <DetailItem label="フルリモート求人の募集状況">
                <RecruitingStatusChip status={company.recruitingStatus} />
              </DetailItem>
            </dl>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-9">
            <h2 className="text-xl font-semibold text-zinc-950">
              情報の確認状況
            </h2>
            <dl className="mt-6">
              <DetailItem label="最終確認日">
                {formatVerifiedDate(company.lastVerifiedAt)}
              </DetailItem>
            </dl>
            <p className="mt-5 text-sm leading-7 text-zinc-500">
              公開情報の変更候補は、管理者が根拠を確認し、承認した後に反映します。
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-9">
            <h2 className="text-xl font-semibold text-zinc-950">情報源</h2>
            {sources.length > 0 ? (
              <ul className="mt-6 space-y-4">
                {sources.map((source) => (
                  <li key={source.id}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl border border-zinc-200 p-4 text-blue-700 hover:border-blue-300 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      <span className="block text-sm font-semibold">
                        {sourceTypeLabels[source.sourceType]}
                      </span>
                      <span className="mt-1 block text-sm break-all text-zinc-600">
                        {source.url}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-zinc-600">情報源を確認中です。</p>
            )}
          </section>
        </div>

        <aside className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
          <h2 className="font-semibold text-zinc-950">公式情報を確認する</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            応募前に、最新の募集状況と勤務条件を公式サイトでご確認ください。
          </p>
          <div className="mt-6 space-y-3">
            {company.recruitUrl ? (
              <a
                href={company.recruitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-center font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                公式採用サイトを見る
                <span aria-hidden="true" className="ml-2">
                  ↗
                </span>
              </a>
            ) : (
              <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600">
                公式採用サイトを確認中です。
              </p>
            )}
            {company.officialUrl && (
              <a
                href={company.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-center font-semibold text-zinc-900 hover:border-blue-300 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                公式サイトを見る
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

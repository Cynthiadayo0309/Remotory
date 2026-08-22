import Link from "next/link";
import { notFound } from "next/navigation";

import { CompanyForm } from "@/features/admin/companies/components/company-form";
import { SourceManager } from "@/features/admin/companies/components/source-manager";
import { PublicationStatusBadge } from "@/features/admin/companies/components/publication-status-badge";
import { getAdminCompany } from "@/features/admin/companies/server/admin-company-queries";
import { idSchema } from "@/validation/company";

export const dynamic = "force-dynamic";

export default async function EditCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const detail = await getAdminCompany(id);
  if (!detail) notFound();
  const created = (await searchParams).created === "1";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14"
    >
      <Link
        href="/admin/companies"
        className="text-sm font-semibold text-blue-700 hover:text-blue-900"
      >
        ← 企業一覧へ戻る
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-blue-700 uppercase">
            Edit company
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            {detail.company.name}
          </h1>
        </div>
        <PublicationStatusBadge status={detail.company.publicationStatus} />
      </div>
      {created && (
        <p
          role="status"
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          企業を「要確認」として登録しました。情報源を追加し、内容を確認してから公開してください。
        </p>
      )}
      <div className="mt-8 space-y-7">
        <CompanyForm mode="edit" company={detail.company} />
        <SourceManager
          companyId={detail.company.id}
          initialSources={detail.sources}
        />
      </div>
    </main>
  );
}

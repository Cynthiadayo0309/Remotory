import Link from "next/link";

import { CompanyForm } from "@/features/admin/companies/components/company-form";

export default function NewCompanyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
      <Link
        href="/admin/companies"
        className="text-sm font-semibold text-blue-700 hover:text-blue-900"
      >
        ← 企業一覧へ戻る
      </Link>
      <div className="mt-5">
        <p className="text-sm font-semibold tracking-[0.14em] text-blue-700 uppercase">
          New company
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
          企業を登録
        </h1>
        <p className="mt-3 leading-7 text-zinc-600">
          新規企業は「要確認」として登録されます。登録後に情報源と公開状態を設定してください。
        </p>
      </div>
      <div className="mt-8">
        <CompanyForm mode="create" />
      </div>
    </main>
  );
}

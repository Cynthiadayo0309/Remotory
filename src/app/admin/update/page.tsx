import { CompanyUpdatePanel } from "@/features/admin/update-runs/components/company-update-panel";
import { getLatestCompanyUpdateRun } from "@/features/admin/update-runs/server/admin-update-run-queries";

export const dynamic = "force-dynamic";

export default async function AdminUpdatePage() {
  const latestRun = await getLatestCompanyUpdateRun();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
      <div>
        <p className="text-sm font-semibold tracking-[0.14em] text-blue-700 uppercase">
          Company checks
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
          全企業の情報を更新
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-zinc-600">
          企業の公開情報を一括で確認し、変更候補と確認が必要な結果を管理します。
        </p>
      </div>

      <div className="mt-8">
        <CompanyUpdatePanel initialRun={latestRun} />
      </div>
    </main>
  );
}

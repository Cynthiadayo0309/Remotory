import Link from "next/link";

import { ReviewCandidateCard } from "@/features/admin/reviews/components/review-candidate-card";
import { getCompanyCandidateValue } from "@/features/admin/reviews/review-presentation";
import { getAdminReviewGroups } from "@/features/admin/reviews/server/admin-review-queries";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const groups = await getAdminReviewGroups();
  const total = groups.reduce(
    (count, group) => count + group.candidates.length,
    0,
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
      <div>
        <p className="text-sm font-semibold tracking-[0.14em] text-blue-700 uppercase">
          Reviews
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
          変更候補レビュー
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-zinc-600">
          AIが公開情報から抽出した候補です。現在値・根拠・情報源を確認し、承認または却下してください。承認するまで公開企業情報は変わりません。
        </p>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-zinc-600">
          レビュー待ち:{" "}
          <span className="font-semibold text-zinc-950">
            {total.toLocaleString("ja-JP")}件
          </span>
        </p>
        <Link
          href="/admin"
          className="text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          ダッシュボードへ
        </Link>
      </div>

      {groups.length > 0 ? (
        <div className="mt-8 space-y-10">
          {groups.map(({ company, candidates }) => (
            <section key={company.id} aria-labelledby={`company-${company.id}`}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-500">
                    {candidates.length}件の候補
                  </p>
                  <h2
                    id={`company-${company.id}`}
                    className="mt-1 text-2xl font-semibold text-zinc-950"
                  >
                    {company.name}
                  </h2>
                </div>
                <Link
                  href={`/admin/companies/${company.id}/edit`}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                >
                  企業情報を確認
                </Link>
              </div>
              <div className="grid gap-5">
                {candidates.map((candidate) => (
                  <ReviewCandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    currentValue={getCompanyCandidateValue(
                      company,
                      candidate.fieldName,
                    )}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">
            レビュー待ちの候補はありません
          </h2>
          <p className="mt-2 text-zinc-600">
            新しい変更候補が作成されると、この画面に企業単位で表示されます。
          </p>
        </section>
      )}
    </main>
  );
}

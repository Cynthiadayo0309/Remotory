import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Remotoryについて",
  description: "フルリモートで働ける企業を探すためのRemotoryについて。",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Remotoryについて",
    description: "フルリモートで働ける企業を探すためのRemotoryについて。",
    siteName: "Remotory",
    locale: "ja_JP",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
      <p className="text-sm font-semibold tracking-[0.16em] text-blue-700 uppercase">
        About
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
        Remotoryについて
      </h1>
      <p className="mt-6 max-w-3xl text-lg leading-9 text-zinc-600">
        Remotoryは、日本に拠点があり、フルリモートで働けるポジションを持つ企業を探すための企業ディレクトリです。
      </p>

      <div className="mt-12 space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-9">
          <h2 className="text-2xl font-semibold text-zinc-950">
            求人票ではなく、企業と働き方を見つける
          </h2>
          <p className="mt-4 leading-8 text-zinc-600">
            個別の求人詳細を集めるのではなく、企業ごとのフルリモート対象範囲、勤務地域、出社条件、募集状況を整理します。気になる企業を見つけたら、公式採用サイトで最新情報を確認できます。
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-9">
          <h2 className="text-2xl font-semibold text-zinc-950">
            根拠と確認日をわかりやすく
          </h2>
          <p className="mt-4 leading-8 text-zinc-600">
            リモート勤務の条件は変わることがあります。Remotoryでは、情報源と最終確認日を表示し、どの時点の情報かを判断できるようにします。
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-9">
          <h2 className="text-2xl font-semibold text-zinc-950">
            人のレビューを経て更新
          </h2>
          <p className="mt-4 leading-8 text-zinc-600">
            公開情報の変化を検知しても、そのまま企業情報を書き換えることはありません。変更候補を作成し、管理者が根拠をレビューして承認した内容だけを反映します。
          </p>
        </section>
      </div>
    </div>
  );
}

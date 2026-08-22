import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "掲載基準",
  description: "Remotoryに企業情報を掲載する際の基準をご案内します。",
  alternates: { canonical: "/criteria" },
  openGraph: {
    title: "掲載基準",
    description: "Remotoryに企業情報を掲載する際の基準をご案内します。",
    siteName: "Remotory",
    locale: "ja_JP",
    type: "website",
  },
};

const criteria = [
  {
    title: "日本に拠点があること",
    description:
      "日本国内に法人または事業拠点があり、日本で働く人が応募先として検討できる企業を対象にします。",
  },
  {
    title: "フルリモート勤務が可能なこと",
    description:
      "少なくとも一部のポジションで、日常的な出社を前提としない働き方が公式情報から確認できる企業を掲載します。",
  },
  {
    title: "公式の情報源を確認できること",
    description:
      "企業サイトや公式採用サイトなど、勤務条件や募集状況の根拠となる公開情報を確認できることを重視します。",
  },
];

export default function CriteriaPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
      <p className="text-sm font-semibold tracking-[0.16em] text-blue-700 uppercase">
        Criteria
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
        掲載基準
      </h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-600">
        Remotoryでは、働き方を判断するための根拠が確認できる企業情報だけを公開します。
      </p>

      <div className="mt-12 space-y-5">
        {criteria.map((item, index) => (
          <section
            key={item.title}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <p className="text-sm font-semibold text-blue-700">
              基準 {index + 1}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-950">
              {item.title}
            </h2>
            <p className="mt-3 leading-8 text-zinc-600">{item.description}</p>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-2xl bg-blue-50 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-zinc-950">
          情報更新の考え方
        </h2>
        <p className="mt-3 leading-8 text-zinc-700">
          公開情報に変更が見つかった場合は、変更候補として記録し、根拠を人がレビューしたうえで公開内容へ反映します。変更がない場合のみ、最終確認日を更新します。
        </p>
      </section>
    </div>
  );
}

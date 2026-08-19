import Link from "next/link";

import { CompanyCard } from "@/features/companies/components/company-card";
import { CompanySearchForm } from "@/features/companies/components/company-search-form";
import {
  buildPublicCompanySearchHref,
  parsePublicCompanySearchParams,
  type PublicSearchParams,
} from "@/features/companies/public-company-search";
import { getPublicCompanyListing } from "@/features/companies/server/public-company-queries";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<PublicSearchParams>;
}) {
  const search = parsePublicCompanySearchParams(await searchParams);
  const listing = await getPublicCompanyListing(search);

  return (
    <>
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
          <p className="text-sm font-semibold tracking-[0.16em] text-blue-700 uppercase">
            Remote company directory
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
            フルリモートで働ける企業を探す
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-600 sm:text-lg">
            日本に拠点があり、フルリモート勤務が可能な企業を、勤務条件や募集状況と一緒に探せます。
          </p>
        </div>
      </section>

      <section
        aria-labelledby="company-search-title"
        className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10"
      >
        <div className="mb-6">
          <h2
            id="company-search-title"
            className="text-2xl font-semibold tracking-tight text-zinc-950"
          >
            企業を検索
          </h2>
          <p className="mt-2 text-zinc-600">
            条件を選んで、働き方に合う企業を絞り込めます。
          </p>
        </div>
        <CompanySearchForm search={search} industries={listing.industries} />

        <div className="mt-12 flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-medium text-zinc-500">公開企業数</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {listing.total.toLocaleString("ja-JP")}社
            </p>
          </div>
          {listing.total > 0 && (
            <p className="text-sm text-zinc-500">
              {listing.companies.length.toLocaleString("ja-JP")}社を表示中
            </p>
          )}
        </div>

        {listing.companies.length > 0 ? (
          <div className="mt-6 space-y-5">
            {listing.companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-zinc-950">
              条件に合う企業が見つかりませんでした
            </h2>
            <p className="mt-2 text-zinc-600">
              キーワードやフィルターを変更してお試しください。
            </p>
          </div>
        )}

        {listing.hasMore && (
          <div className="mt-8 text-center">
            <Link
              href={buildPublicCompanySearchHref(
                search,
                listing.loadedPage + 1,
              )}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-7 font-semibold text-zinc-900 shadow-sm hover:border-blue-300 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              さらに表示
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

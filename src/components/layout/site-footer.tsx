import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-10 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <div>
          <p className="font-semibold text-zinc-900">Remotory</p>
          <p className="mt-1">
            フルリモートで働ける企業の情報を、わかりやすく。
          </p>
        </div>
        <nav aria-label="フッターナビゲーション" className="flex gap-5">
          <Link className="hover:text-blue-700" href="/criteria">
            掲載基準
          </Link>
          <Link className="hover:text-blue-700" href="/about">
            Remotoryについて
          </Link>
        </nav>
      </div>
    </footer>
  );
}

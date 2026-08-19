import Link from "next/link";

const navigation = [
  { href: "/", label: "企業を探す" },
  { href: "/criteria", label: "掲載基準" },
  { href: "/about", label: "Remotoryについて" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-zinc-950 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          Remotory
        </Link>
        <nav aria-label="メインナビゲーション" className="w-full sm:w-auto">
          <ul className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm font-medium text-zinc-600 sm:justify-start sm:gap-x-7">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

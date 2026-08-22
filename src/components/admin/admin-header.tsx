import Link from "next/link";

const links = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/companies", label: "企業管理" },
  { href: "/admin/reviews", label: "変更レビュー" },
  { href: "/admin/update", label: "一括確認" },
];

export function AdminHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <div className="flex items-center gap-7">
          <Link
            href="/admin"
            className="text-lg font-semibold tracking-tight text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            Remotory <span className="text-sm text-blue-700">Admin</span>
          </Link>
          <nav aria-label="管理画面">
            <ul className="flex flex-wrap gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-blue-700 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          公開サイトを見る
        </Link>
      </div>
    </header>
  );
}

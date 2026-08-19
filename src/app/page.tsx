import { ComingSoonButton } from "@/components/ui/coming-soon-button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-20 sm:px-10 lg:px-12">
      <section aria-labelledby="page-title" className="max-w-3xl space-y-8">
        <div className="space-y-4">
          <p className="text-sm font-semibold tracking-[0.18em] text-zinc-500 uppercase">
            Remote + Directory
          </p>
          <h1
            id="page-title"
            className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl"
          >
            フルリモートで働ける企業を探す
          </h1>
          <p className="max-w-2xl text-base leading-8 text-zinc-600 sm:text-lg">
            日本に拠点があり、フルリモート勤務が可能な企業を、勤務条件や募集状況と一緒に探せます。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <ComingSoonButton />
          <p className="text-sm text-zinc-500">現在、MVPを準備しています。</p>
        </div>
      </section>
    </main>
  );
}

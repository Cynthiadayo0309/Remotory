"use client";

import { useEffect, useState } from "react";

import {
  formatUpdateRunDate,
  updateRunStatusLabels,
} from "@/features/admin/update-runs/update-run-presentation";
import type { CompanyUpdateRun } from "@/types/update-run";

function isActive(run: CompanyUpdateRun | null): boolean {
  return run?.status === "queued" || run?.status === "running";
}

export function CompanyUpdatePanel({
  initialRun,
}: {
  initialRun: CompanyUpdateRun | null;
}) {
  const [run, setRun] = useState(initialRun);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isActive(run)) return;

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/admin/update-runs", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          run?: CompanyUpdateRun | null;
        };
        if (response.ok) setRun(payload.run ?? null);
      } catch {
        // The next polling interval retries. The current persisted state remains visible.
      }
    }, 3_000);

    return () => window.clearInterval(timer);
  }, [run]);

  async function start() {
    setStarting(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/update-runs", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        run?: CompanyUpdateRun | null;
        message?: string;
      };
      if (!response.ok || !payload.run) {
        setMessage(payload.message ?? "一括確認を開始できませんでした。");
        return;
      }
      setRun(payload.run);
      setMessage("一括確認を開始しました。画面は自動更新されます。");
    } catch {
      setMessage("通信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setStarting(false);
    }
  }

  const active = isActive(run);
  const progress = run
    ? run.totalCompanies === 0
      ? 0
      : Math.round((run.processedCompanies / run.totalCompanies) * 100)
    : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-950">実行</h2>
        <p className="mt-3 leading-7 text-zinc-600">
          公開中の企業を対象に、有効な情報源の取得・変更判定・必要時のAI解析を行います。変更は候補として保存され、承認するまで公開情報には反映されません。
        </p>
        <button
          type="button"
          disabled={starting || active}
          aria-busy={starting}
          onClick={start}
          className="mt-6 min-h-11 min-w-52 rounded-xl bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-500"
        >
          {starting
            ? "開始しています"
            : active
              ? "一括確認を実行中"
              : "全企業の情報を更新"}
        </button>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          一時的な取得・AI障害だけを最大2回再試行します。判断不能や情報源間の競合は自動更新せず、要確認として記録します。
        </p>
        {message && (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 text-sm font-medium text-blue-800"
          >
            {message}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-zinc-950">最新の実行</h2>
          {run && (
            <span className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-800">
              {updateRunStatusLabels[run.status]}
            </span>
          )}
        </div>

        {run ? (
          <>
            <div className="mt-5" aria-live="polite">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-zinc-700">進捗</span>
                <span className="font-semibold text-zinc-950">
                  {run.processedCompanies.toLocaleString("ja-JP")} /{" "}
                  {run.totalCompanies.toLocaleString("ja-JP")}社（{progress}%）
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200"
                role="progressbar"
                aria-label="一括確認の進捗"
                aria-valuemin={0}
                aria-valuemax={run.totalCompanies}
                aria-valuenow={run.processedCompanies}
              >
                <div
                  className="h-full rounded-full bg-blue-700 transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-zinc-50 p-3">
                <dt className="text-zinc-500">変更なし</dt>
                <dd className="mt-1 text-lg font-semibold text-zinc-950">
                  {run.unchangedCompanies}
                </dd>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3">
                <dt className="text-zinc-500">変更候補あり</dt>
                <dd className="mt-1 text-lg font-semibold text-zinc-950">
                  {run.changedCompanies}
                </dd>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3">
                <dt className="text-zinc-500">要確認</dt>
                <dd className="mt-1 text-lg font-semibold text-zinc-950">
                  {run.needsReviewCompanies}
                </dd>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3">
                <dt className="text-zinc-500">失敗</dt>
                <dd className="mt-1 text-lg font-semibold text-zinc-950">
                  {run.failedCompanies}
                </dd>
              </div>
            </dl>

            <dl className="mt-5 space-y-2 border-t border-zinc-200 pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">作成された候補</dt>
                <dd className="font-semibold text-zinc-950">
                  {run.candidateCount}件
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">開始</dt>
                <dd className="font-medium text-zinc-800">
                  {formatUpdateRunDate(run.startedAt ?? run.createdAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">完了</dt>
                <dd className="font-medium text-zinc-800">
                  {formatUpdateRunDate(run.completedAt)}
                </dd>
              </div>
            </dl>
            {run.errorMessage && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
              >
                {run.errorMessage}
              </p>
            )}
          </>
        ) : (
          <p className="mt-5 text-zinc-600">
            一括確認はまだ実行されていません。
          </p>
        )}
      </section>
    </div>
  );
}

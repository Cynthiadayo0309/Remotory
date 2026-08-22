"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  candidateFieldLabels,
  formatCandidateValue,
} from "@/features/admin/reviews/review-presentation";
import type { CompanyChangeCandidate } from "@/types/company";

type ReviewState = "idle" | "approving" | "rejecting" | "error";

function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function ReviewCandidateCard({
  candidate,
  currentValue,
}: {
  candidate: CompanyChangeCandidate;
  currentValue: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<ReviewState>("idle");
  const [message, setMessage] = useState("");

  async function review(decision: "approve" | "reject") {
    setState(decision === "approve" ? "approving" : "rejecting");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/reviews/${candidate.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setState("error");
        setMessage(
          result.message ??
            "レビューを保存できませんでした。再読み込みして確認してください。",
        );
        return;
      }

      router.refresh();
    } catch {
      setState("error");
      setMessage("通信に失敗しました。時間をおいて再度お試しください。");
    }
  }

  const pending = state === "approving" || state === "rejecting";
  const stale = currentValue !== candidate.oldValue;
  const sourceUrl = safeHttpUrl(candidate.sourceUrl);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-zinc-950">
          {candidateFieldLabels[candidate.fieldName]}
        </h3>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
          レビュー待ち
        </span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <dt className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            現在値
          </dt>
          <dd className="mt-2 font-medium break-words text-zinc-800">
            {formatCandidateValue(candidate.fieldName, currentValue)}
          </dd>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <dt className="text-xs font-semibold tracking-wide text-blue-700 uppercase">
            候補値
          </dt>
          <dd className="mt-2 font-semibold break-words text-zinc-950">
            {formatCandidateValue(candidate.fieldName, candidate.newValue)}
          </dd>
        </div>
      </dl>

      {stale && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 font-medium text-amber-900"
        >
          候補作成後に企業情報が変更されています。承認はできません。現在値を確認し、この候補を却下してください。
        </p>
      )}

      <div className="mt-5 rounded-xl border border-zinc-200 p-4">
        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          根拠
        </p>
        <blockquote className="mt-2 text-sm leading-7 whitespace-pre-wrap text-zinc-800">
          {candidate.evidenceText ?? "根拠テキストなし"}
        </blockquote>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4 text-sm">
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold break-all text-blue-700 hover:text-blue-900"
            >
              情報源を新しいタブで開く
            </a>
          ) : (
            <span className="text-zinc-500">情報源URLなし</span>
          )}
          <span className="font-medium text-zinc-600">
            AI信頼度: {Math.round((candidate.confidence ?? 0) * 100)}%
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-5">
        <Button
          type="button"
          variant="primary"
          isPending={state === "approving"}
          isDisabled={pending || stale}
          onPress={() => review("approve")}
          className="min-w-28"
        >
          承認して反映
        </Button>
        <Button
          type="button"
          variant="outline"
          isPending={state === "rejecting"}
          isDisabled={pending}
          onPress={() => review("reject")}
          className="min-w-24"
        >
          却下
        </Button>
        {message && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {message}
          </p>
        )}
      </div>
    </article>
  );
}

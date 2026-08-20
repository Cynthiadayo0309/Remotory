"use client";

import { useState, type FormEvent } from "react";

import { adminSourceTypeLabels } from "@/features/admin/companies/admin-presentation";
import {
  sourceTypes,
  type CompanySource,
  type SourceType,
} from "@/types/company";

const inputClass =
  "min-h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

interface SourceDraft {
  sourceType: SourceType;
  url: string;
  isActive: boolean;
}

function fields(form: FormData): SourceDraft {
  return {
    sourceType: String(form.get("sourceType")) as SourceType,
    url: String(form.get("url") ?? "").trim(),
    isActive: form.get("isActive") === "on",
  };
}

export function SourceManager({
  companyId,
  initialSources,
}: {
  companyId: string;
  initialSources: CompanySource[];
}) {
  const [sources, setSources] = useState(initialSources);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function addSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingId("new");
    setMessage("");
    const form = event.currentTarget;
    try {
      const response = await fetch(
        `/api/admin/companies/${companyId}/sources`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields(new FormData(form))),
        },
      );
      const result = (await response.json()) as { source?: CompanySource };
      if (response.ok && result.source) {
        setSources((current) => [...current, result.source as CompanySource]);
        form.reset();
        setMessage("情報源を追加しました。");
      } else {
        setMessage(
          response.status === 409
            ? "同じURLはすでに登録されています。"
            : "情報源を追加できませんでした。",
        );
      }
    } catch {
      setMessage("通信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSavingId(null);
    }
  }

  async function updateSource(
    event: FormEvent<HTMLFormElement>,
    sourceId: string,
  ) {
    event.preventDefault();
    setSavingId(sourceId);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/companies/${companyId}/sources/${sourceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields(new FormData(event.currentTarget))),
        },
      );
      const result = (await response.json()) as { source?: CompanySource };
      if (response.ok && result.source) {
        setSources((current) =>
          current.map((source) =>
            source.id === sourceId ? (result.source as CompanySource) : source,
          ),
        );
        setMessage("情報源を更新しました。");
      } else {
        setMessage(
          response.status === 409
            ? "同じURLはすでに登録されています。"
            : "情報源を更新できませんでした。",
        );
      }
    } catch {
      setMessage("通信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
      aria-labelledby="sources-heading"
    >
      <div>
        <h2
          id="sources-heading"
          className="text-xl font-semibold text-zinc-950"
        >
          情報源URL
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          公式情報を優先して複数登録できます。停止したURLは履歴として保持されます。
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {sources.map((source) => (
          <form
            key={source.id}
            onSubmit={(event) => updateSource(event, source.id)}
            className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-[180px_1fr_auto_auto] md:items-end"
          >
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              種別
              <select
                name="sourceType"
                defaultValue={source.sourceType}
                className={inputClass}
              >
                {sourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {adminSourceTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              URL
              <input
                type="url"
                name="url"
                required
                defaultValue={source.url}
                className={inputClass}
              />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-zinc-700">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={source.isActive}
                className="size-4 accent-blue-700"
              />
              有効
            </label>
            <button
              type="submit"
              disabled={savingId === source.id}
              className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:border-blue-300 disabled:cursor-wait"
            >
              保存
            </button>
          </form>
        ))}
        {sources.length === 0 && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            情報源が未登録です。公開前に根拠URLを追加してください。
          </p>
        )}
      </div>

      <form
        onSubmit={addSource}
        className="mt-6 grid gap-3 border-t border-zinc-200 pt-6 md:grid-cols-[180px_1fr_auto] md:items-end"
      >
        <label className="grid gap-2 text-sm font-semibold text-zinc-700">
          種別
          <select
            name="sourceType"
            defaultValue="recruit"
            className={inputClass}
          >
            {sourceTypes.map((type) => (
              <option key={type} value={type}>
                {adminSourceTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-zinc-700">
          新しい情報源URL
          <input
            type="url"
            name="url"
            required
            placeholder="https://"
            className={inputClass}
          />
          <input type="hidden" name="isActive" value="on" />
        </label>
        <button
          type="submit"
          disabled={savingId === "new"}
          className="min-h-11 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-wait"
        >
          追加
        </button>
      </form>
      {message && (
        <p role="status" className="mt-4 text-sm font-medium text-zinc-700">
          {message}
        </p>
      )}
    </section>
  );
}

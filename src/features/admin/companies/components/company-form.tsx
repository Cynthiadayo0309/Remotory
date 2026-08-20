"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { CompanyFields } from "@/features/admin/companies/components/company-fields";
import type { Company } from "@/types/company";

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string): string | null {
  return text(formData, name) || null;
}

export function CompanyForm({
  mode,
  company,
}: {
  mode: "create" | "edit";
  company?: Company;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: text(formData, "name"),
      slug: text(formData, "slug"),
      description: nullableText(formData, "description"),
      industry: nullableText(formData, "industry"),
      officialUrl: nullableText(formData, "officialUrl"),
      recruitUrl: nullableText(formData, "recruitUrl"),
      remoteScope: text(formData, "remoteScope"),
      workLocationScope: text(formData, "workLocationScope"),
      workLocationNote: nullableText(formData, "workLocationNote"),
      officeRequired: text(formData, "officeRequired"),
      officeNote: nullableText(formData, "officeNote"),
      recruitingStatus: text(formData, "recruitingStatus"),
      ...(mode === "edit"
        ? { publicationStatus: text(formData, "publicationStatus") }
        : {}),
    };

    try {
      const response = await fetch(
        mode === "create"
          ? "/api/admin/companies"
          : `/api/admin/companies/${company?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as {
        company?: Company;
        error?: string;
      };
      if (!response.ok || !result.company) {
        setStatus("error");
        setMessage(
          response.status === 409
            ? "同じslugの企業がすでに登録されています。"
            : "入力内容を確認してください。",
        );
        return;
      }
      if (mode === "create") {
        router.push(`/admin/companies/${result.company.id}/edit?created=1`);
        return;
      }
      setStatus("success");
      setMessage("企業情報を保存しました。");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("通信に失敗しました。時間をおいて再度お試しください。");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <CompanyFields
        company={company}
        showPublicationStatus={mode === "edit"}
      />
      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-6">
        <button
          type="submit"
          disabled={status === "saving"}
          className="inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-6 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:bg-blue-400"
        >
          {status === "saving"
            ? "保存中…"
            : mode === "create"
              ? "要確認として登録"
              : "変更を保存"}
        </button>
        {message && (
          <p
            role={status === "error" ? "alert" : "status"}
            className={
              status === "error"
                ? "text-sm font-medium text-red-700"
                : "text-sm font-medium text-emerald-700"
            }
          >
            {message}
          </p>
        )}
      </div>
    </form>
  );
}

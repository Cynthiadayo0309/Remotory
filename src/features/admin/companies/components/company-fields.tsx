import {
  publicationStatusLabels,
  adminRecruitingStatusLabels,
} from "@/features/admin/companies/admin-presentation";
import {
  officeRequirementLabels,
  remoteScopeLabels,
  workLocationScopeLabels,
} from "@/features/companies/presentation";
import {
  officeRequirements,
  publicationStatuses,
  recruitingStatuses,
  remoteScopes,
  workLocationScopes,
  type Company,
} from "@/types/company";

const inputClass =
  "min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
const labelClass = "grid gap-2 text-sm font-semibold text-zinc-800";

export function CompanyFields({
  company,
  showPublicationStatus,
}: {
  company?: Company;
  showPublicationStatus: boolean;
}) {
  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="text-lg font-semibold text-zinc-950">
          基本情報
        </legend>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <label className={labelClass}>
            企業名{" "}
            <input
              name="name"
              required
              maxLength={200}
              defaultValue={company?.name}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            slug{" "}
            <input
              name="slug"
              required
              maxLength={100}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              defaultValue={company?.slug}
              placeholder="example-company"
              className={inputClass}
            />
            <span className="leading-5 font-normal text-zinc-500">
              半角英小文字・数字・ハイフン。公開URLに使用します。
            </span>
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            企業概要{" "}
            <textarea
              name="description"
              maxLength={2000}
              rows={5}
              defaultValue={company?.description ?? ""}
              className={`${inputClass} py-3`}
            />
          </label>
          <label className={labelClass}>
            業種{" "}
            <input
              name="industry"
              maxLength={100}
              defaultValue={company?.industry ?? ""}
              className={inputClass}
            />
          </label>
          {showPublicationStatus && (
            <label className={labelClass}>
              公開状態{" "}
              <select
                name="publicationStatus"
                defaultValue={company?.publicationStatus ?? "needs_review"}
                className={inputClass}
              >
                {publicationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {publicationStatusLabels[status]}
                  </option>
                ))}
              </select>
              <span className="leading-5 font-normal text-zinc-500">
                公開前に根拠URLと各条件を確認してください。
              </span>
            </label>
          )}
          <label className={labelClass}>
            公式サイトURL{" "}
            <input
              type="url"
              name="officialUrl"
              defaultValue={company?.officialUrl ?? ""}
              placeholder="https://"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            公式採用サイトURL{" "}
            <input
              type="url"
              name="recruitUrl"
              defaultValue={company?.recruitUrl ?? ""}
              placeholder="https://"
              className={inputClass}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-semibold text-zinc-950">
          リモート勤務条件
        </legend>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <label className={labelClass}>
            フルリモート対象範囲{" "}
            <select
              name="remoteScope"
              defaultValue={company?.remoteScope ?? "unknown"}
              className={inputClass}
            >
              {remoteScopes.map((value) => (
                <option key={value} value={value}>
                  {remoteScopeLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            勤務地域{" "}
            <select
              name="workLocationScope"
              defaultValue={company?.workLocationScope ?? "unknown"}
              className={inputClass}
            >
              {workLocationScopes.map((value) => (
                <option key={value} value={value}>
                  {workLocationScopeLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            勤務地域・地域制限の補足{" "}
            <textarea
              name="workLocationNote"
              maxLength={500}
              rows={3}
              defaultValue={company?.workLocationNote ?? ""}
              className={`${inputClass} py-3`}
            />
          </label>
          <label className={labelClass}>
            出社有無{" "}
            <select
              name="officeRequired"
              defaultValue={company?.officeRequired ?? "unknown"}
              className={inputClass}
            >
              {officeRequirements.map((value) => (
                <option key={value} value={value}>
                  {officeRequirementLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            募集状況{" "}
            <select
              name="recruitingStatus"
              defaultValue={company?.recruitingStatus ?? "unknown"}
              className={inputClass}
            >
              {recruitingStatuses.map((value) => (
                <option key={value} value={value}>
                  {adminRecruitingStatusLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            出社条件の補足{" "}
            <textarea
              name="officeNote"
              maxLength={500}
              rows={3}
              defaultValue={company?.officeNote ?? ""}
              className={`${inputClass} py-3`}
            />
          </label>
        </div>
      </fieldset>
    </div>
  );
}

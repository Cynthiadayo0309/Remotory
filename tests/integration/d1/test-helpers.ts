import { env } from "cloudflare:workers";

import type { CreateCompanyInput } from "@/validation/company";

export const baseCompanyInput: CreateCompanyInput = {
  slug: "test-company",
  name: "テスト株式会社",
  description: "D1 repositoryテスト用の架空企業です。",
  officialUrl: "https://example.com/test-company",
  recruitUrl: "https://example.com/test-company/careers",
  industry: "ソフトウェア",
  remoteScope: "partial",
  workLocationScope: "nationwide",
  officeRequired: "no",
  recruitingStatus: "open",
  publicationStatus: "published",
};

export async function clearDatabase(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM company_update_run_checks"),
    env.DB.prepare("DELETE FROM company_update_runs"),
    env.DB.prepare("DELETE FROM company_change_candidates"),
    env.DB.prepare("DELETE FROM company_checks"),
    env.DB.prepare("DELETE FROM company_sources"),
    env.DB.prepare("DELETE FROM companies"),
  ]);
}

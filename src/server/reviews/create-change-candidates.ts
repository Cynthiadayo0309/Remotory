import type { AiRemotePolicyAnalysis } from "@/server/ai/types";
import { createRepositories } from "@/server/db";
import type { RepositoryDependencies } from "@/server/db/repository-dependencies";
import { generateCompanyChangeCandidates } from "@/server/reviews/candidate-generation";
import type { CandidateGenerationIssue } from "@/server/reviews/candidate-generation";
import type { CompanyChangeCandidate } from "@/types/company";
import { idSchema } from "@/validation/company";

export type CreateChangeCandidatesResult =
  | {
      ok: true;
      candidates: CompanyChangeCandidate[];
      issues: CandidateGenerationIssue[];
    }
  | {
      ok: false;
      reason: "company_not_found" | "check_not_found" | "check_mismatch";
    };

export async function createChangeCandidatesFromAnalysis(
  db: D1Database,
  input: {
    companyId: string;
    checkId: string;
    analysis: AiRemotePolicyAnalysis;
  },
  dependencies?: Partial<RepositoryDependencies>,
): Promise<CreateChangeCandidatesResult> {
  const companyId = idSchema.parse(input.companyId);
  const checkId = idSchema.parse(input.checkId);
  const repositories = createRepositories(db, dependencies);
  const [company, check] = await Promise.all([
    repositories.companies.findById(companyId),
    repositories.companyChecks.findById(checkId),
  ]);

  if (!company) return { ok: false, reason: "company_not_found" };
  if (!check) return { ok: false, reason: "check_not_found" };
  if (check.companyId !== company.id) {
    return { ok: false, reason: "check_mismatch" };
  }

  const generated = generateCompanyChangeCandidates({
    company,
    checkId,
    analysis: input.analysis,
  });
  const candidates =
    await repositories.companyChangeCandidates.createManyForCheckIfAbsent(
      generated.candidates,
    );

  return { ok: true, candidates, issues: generated.issues };
}

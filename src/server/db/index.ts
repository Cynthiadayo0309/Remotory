import type { RepositoryDependencies } from "@/server/db/repository-dependencies";
import {
  CompanyChangeCandidateRepository,
  CompanyCheckRepository,
  CompanyRepository,
  CompanySourceRepository,
} from "@/server/db/repositories";

export function createRepositories(
  db: D1Database,
  dependencies?: Partial<RepositoryDependencies>,
) {
  return {
    companies: new CompanyRepository(db, dependencies),
    companySources: new CompanySourceRepository(db, dependencies),
    companyChecks: new CompanyCheckRepository(db, dependencies),
    companyChangeCandidates: new CompanyChangeCandidateRepository(
      db,
      dependencies,
    ),
  };
}

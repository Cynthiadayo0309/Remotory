import { createRepositories } from "@/server/db";
import { getDatabase } from "@/server/db/context";

export async function getLatestCompanyUpdateRun() {
  return createRepositories(getDatabase()).companyUpdateRuns.findLatest();
}

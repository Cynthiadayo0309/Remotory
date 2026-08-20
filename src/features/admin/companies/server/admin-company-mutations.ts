import {
  adminCreateCompanySchema,
  adminCreateCompanySourceSchema,
  adminUpdateCompanySchema,
  adminUpdateCompanySourceSchema,
} from "@/features/admin/companies/admin-company-validation";
import { createRepositories } from "@/server/db";
import { getDatabase } from "@/server/db/context";
import { idSchema } from "@/validation/company";

export async function createAdminCompany(input: unknown) {
  const value = adminCreateCompanySchema.parse(input);
  return createRepositories(getDatabase()).companies.create(value);
}

export async function updateAdminCompany(id: string, input: unknown) {
  const validId = idSchema.parse(id);
  const value = adminUpdateCompanySchema.parse(input);
  return createRepositories(getDatabase()).companies.update(validId, value);
}

export async function createAdminCompanySource(
  companyId: string,
  input: unknown,
) {
  const validCompanyId = idSchema.parse(companyId);
  const value = adminCreateCompanySourceSchema.parse(input);
  const repositories = createRepositories(getDatabase());
  const company = await repositories.companies.findById(validCompanyId);
  if (!company) return null;
  return repositories.companySources.create({
    ...value,
    companyId: company.id,
  });
}

export async function updateAdminCompanySource(
  companyId: string,
  sourceId: string,
  input: unknown,
) {
  const validCompanyId = idSchema.parse(companyId);
  const validSourceId = idSchema.parse(sourceId);
  const value = adminUpdateCompanySourceSchema.parse(input);
  const repositories = createRepositories(getDatabase());
  const source = await repositories.companySources.findById(validSourceId);
  if (!source || source.companyId !== validCompanyId) return null;
  return repositories.companySources.update(validSourceId, value);
}

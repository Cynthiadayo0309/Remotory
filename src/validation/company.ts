import { z } from "zod";

import {
  changeCandidateFields,
  checkStatuses,
  fetchStatuses,
  officeRequirements,
  publicationStatuses,
  recruitingStatuses,
  remoteScopes,
  reviewStatuses,
  sourceTypes,
  workLocationScopes,
} from "@/types/company";

const nullableText = (max: number) => z.string().trim().max(max).nullable();
const nullableTimestamp = z.string().datetime({ offset: true }).nullable();
const nullableHttpUrl = z
  .string()
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "URL must use http or https",
  })
  .nullable();

export const idSchema = z.string().uuid();
export const contentHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const sourceFetchRecordSchema = z.object({
  checkedAt: z.string().datetime({ offset: true }),
  observedContentHash: contentHashSchema,
});
export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const companyMutableFields = {
  slug: slugSchema,
  name: z.string().trim().min(1).max(200),
  description: nullableText(2_000),
  officialUrl: nullableHttpUrl,
  recruitUrl: nullableHttpUrl,
  industry: nullableText(100),
  remoteScope: z.enum(remoteScopes),
  workLocationScope: z.enum(workLocationScopes),
  workLocationNote: nullableText(500),
  officeRequired: z.enum(officeRequirements),
  officeNote: nullableText(500),
  recruitingStatus: z.enum(recruitingStatuses),
  publicationStatus: z.enum(publicationStatuses),
  lastVerifiedAt: nullableTimestamp,
  remoteVerifiedAt: nullableTimestamp,
  recruitingVerifiedAt: nullableTimestamp,
};

export const createCompanySchema = z.object({
  ...companyMutableFields,
  description: companyMutableFields.description.default(null),
  officialUrl: companyMutableFields.officialUrl.default(null),
  recruitUrl: companyMutableFields.recruitUrl.default(null),
  industry: companyMutableFields.industry.default(null),
  remoteScope: companyMutableFields.remoteScope.default("unknown"),
  workLocationScope: companyMutableFields.workLocationScope.default("unknown"),
  workLocationNote: companyMutableFields.workLocationNote.default(null),
  officeRequired: companyMutableFields.officeRequired.default("unknown"),
  officeNote: companyMutableFields.officeNote.default(null),
  recruitingStatus: companyMutableFields.recruitingStatus.default("unknown"),
  publicationStatus:
    companyMutableFields.publicationStatus.default("needs_review"),
  lastVerifiedAt: companyMutableFields.lastVerifiedAt.default(null),
  remoteVerifiedAt: companyMutableFields.remoteVerifiedAt.default(null),
  recruitingVerifiedAt: companyMutableFields.recruitingVerifiedAt.default(null),
});
export const updateCompanySchema = z
  .object(companyMutableFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
export const companyListFiltersSchema = z.object({
  keyword: z.string().trim().max(200).optional(),
  publicationStatus: z.enum(publicationStatuses).optional(),
  recruitingStatus: z.enum(recruitingStatuses).optional(),
  workLocationScope: z.enum(workLocationScopes).optional(),
  industry: z.string().trim().min(1).max(100).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const companySourceMutableFields = {
  sourceType: z.enum(sourceTypes),
  url: nullableHttpUrl.unwrap(),
  isActive: z.boolean(),
  lastCheckedAt: nullableTimestamp,
  lastContentHash: nullableText(128),
  lastFetchStatus: z.enum(fetchStatuses).nullable(),
  consecutiveFailures: z.number().int().min(0),
};

export const createCompanySourceSchema = z.object({
  ...companySourceMutableFields,
  companyId: idSchema,
  isActive: companySourceMutableFields.isActive.default(true),
  lastCheckedAt: companySourceMutableFields.lastCheckedAt.default(null),
  lastContentHash: companySourceMutableFields.lastContentHash.default(null),
  lastFetchStatus: companySourceMutableFields.lastFetchStatus.default(null),
  consecutiveFailures:
    companySourceMutableFields.consecutiveFailures.default(0),
});
export const updateCompanySourceSchema = z
  .object(companySourceMutableFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const companyCheckMutableFields = {
  completedAt: nullableTimestamp,
  status: z.enum(checkStatuses),
  contentChanged: z.boolean().nullable(),
  aiUsed: z.boolean(),
  aiConfidence: z.number().min(0).max(1).nullable(),
  errorCode: nullableText(100),
  errorMessage: nullableText(2_000),
};

export const createCompanyCheckSchema = z.object({
  ...companyCheckMutableFields,
  companyId: idSchema,
  startedAt: z.string().datetime({ offset: true }).optional(),
  completedAt: companyCheckMutableFields.completedAt.default(null),
  contentChanged: companyCheckMutableFields.contentChanged.default(null),
  aiUsed: companyCheckMutableFields.aiUsed.default(false),
  aiConfidence: companyCheckMutableFields.aiConfidence.default(null),
  errorCode: companyCheckMutableFields.errorCode.default(null),
  errorMessage: companyCheckMutableFields.errorMessage.default(null),
});
export const updateCompanyCheckSchema = z
  .object(companyCheckMutableFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const changeCandidateMutableFields = {
  checkId: idSchema.nullable(),
  fieldName: z.enum(changeCandidateFields),
  oldValue: nullableText(2_000),
  newValue: nullableText(2_000),
  evidenceText: nullableText(4_000),
  sourceUrl: nullableHttpUrl,
  confidence: z.number().min(0).max(1).nullable(),
  reviewStatus: z.enum(reviewStatuses),
  reviewedAt: nullableTimestamp,
};

export const createCompanyChangeCandidateSchema = z.object({
  ...changeCandidateMutableFields,
  companyId: idSchema,
  checkId: changeCandidateMutableFields.checkId.default(null),
  oldValue: changeCandidateMutableFields.oldValue.default(null),
  newValue: changeCandidateMutableFields.newValue.default(null),
  evidenceText: changeCandidateMutableFields.evidenceText.default(null),
  sourceUrl: changeCandidateMutableFields.sourceUrl.default(null),
  confidence: changeCandidateMutableFields.confidence.default(null),
  reviewStatus: changeCandidateMutableFields.reviewStatus.default("pending"),
  reviewedAt: changeCandidateMutableFields.reviewedAt.default(null),
});
export const updateCompanyChangeCandidateSchema = z
  .object(changeCandidateMutableFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export type CreateCompanyInput = z.input<typeof createCompanySchema>;
export type UpdateCompanyInput = z.input<typeof updateCompanySchema>;
export type CompanyListFilters = z.input<typeof companyListFiltersSchema>;
export type CreateCompanySourceInput = z.input<
  typeof createCompanySourceSchema
>;
export type UpdateCompanySourceInput = z.input<
  typeof updateCompanySourceSchema
>;
export type CreateCompanyCheckInput = z.input<typeof createCompanyCheckSchema>;
export type UpdateCompanyCheckInput = z.input<typeof updateCompanyCheckSchema>;
export type CreateCompanyChangeCandidateInput = z.input<
  typeof createCompanyChangeCandidateSchema
>;
export type UpdateCompanyChangeCandidateInput = z.input<
  typeof updateCompanyChangeCandidateSchema
>;

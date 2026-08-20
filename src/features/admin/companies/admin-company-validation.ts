import { z } from "zod";

import {
  createCompanySchema,
  createCompanySourceSchema,
} from "@/validation/company";

const companyFields = createCompanySchema.pick({
  slug: true,
  name: true,
  description: true,
  officialUrl: true,
  recruitUrl: true,
  industry: true,
  remoteScope: true,
  workLocationScope: true,
  workLocationNote: true,
  officeRequired: true,
  officeNote: true,
  recruitingStatus: true,
});

export const adminCreateCompanySchema = companyFields.extend({
  publicationStatus: z.literal("needs_review").default("needs_review"),
});

export const adminUpdateCompanySchema = companyFields.extend({
  publicationStatus: createCompanySchema.shape.publicationStatus,
});

const sourceFields = createCompanySourceSchema.pick({
  sourceType: true,
  url: true,
  isActive: true,
});

export const adminCreateCompanySourceSchema = sourceFields;
export const adminUpdateCompanySourceSchema = sourceFields;

export type AdminCreateCompanyInput = z.input<typeof adminCreateCompanySchema>;
export type AdminUpdateCompanyInput = z.input<typeof adminUpdateCompanySchema>;
export type AdminCompanyFormValue = z.output<typeof adminUpdateCompanySchema>;
export type AdminCompanySourceFormValue = z.output<
  typeof adminUpdateCompanySourceSchema
>;

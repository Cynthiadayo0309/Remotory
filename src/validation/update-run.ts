import { z } from "zod";

import {
  companyUpdateOutcomes,
  companyUpdateRunStatuses,
} from "@/types/update-run";
import { idSchema } from "@/validation/company";

export const companyUpdateRunStatusSchema = z.enum(companyUpdateRunStatuses);
export const companyUpdateOutcomeSchema = z.enum(companyUpdateOutcomes);

export const createCompanyUpdateRunSchema = z.object({
  id: idSchema,
  workflowInstanceId: z.string().trim().min(1).max(100),
  totalCompanies: z.number().int().min(0),
});

export const companyUpdateProgressSchema = z.object({
  outcome: companyUpdateOutcomeSchema,
  candidateCount: z.number().int().min(0),
});

export const companyUpdatePendingLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(1_000);

export const companyUpdateWorkflowParamsSchema = z.object({
  runId: idSchema,
  part: z.number().int().min(1),
});

export type CreateCompanyUpdateRunInput = z.infer<
  typeof createCompanyUpdateRunSchema
>;

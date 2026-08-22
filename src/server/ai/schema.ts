import { z } from "zod";

import {
  officeRequirements,
  recruitingStatuses,
  remoteScopes,
  workLocationScopes,
} from "@/types/company";

export const aiEvidenceFields = [
  "full_remote",
  "remote_scope",
  "work_location_scope",
  "work_location_note",
  "office_required",
  "office_note",
  "recruiting_status",
] as const;

const httpUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.username === "" &&
      url.password === ""
    );
  }, "URL must be an HTTP(S) URL without credentials");

export const aiAnalysisInputSchema = z
  .object({
    companyName: z.string().trim().min(1).max(200),
    sourceUrl: httpUrlSchema,
    normalizedText: z.string().trim().min(1).max(2_097_152),
  })
  .strict();

export const aiEvidenceSchema = z
  .object({
    field: z.enum(aiEvidenceFields),
    text: z.string().trim().min(1).max(500),
    source_url: httpUrlSchema,
  })
  .strict();

const nullableNoteSchema = z.string().trim().min(1).max(500).nullable();

export const aiRemotePolicyAnalysisSchema = z
  .object({
    full_remote: z.boolean().nullable(),
    remote_scope: z.enum(remoteScopes),
    work_location_scope: z.enum(workLocationScopes),
    work_location_note: nullableNoteSchema,
    office_required: z.enum(officeRequirements),
    office_note: nullableNoteSchema,
    recruiting_status: z.enum(recruitingStatuses),
    confidence: z.number().min(0).max(1),
    evidence: z.array(aiEvidenceSchema).max(12),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.full_remote !== true && value.remote_scope !== "unknown") {
      context.addIssue({
        code: "custom",
        path: ["remote_scope"],
        message: "A known remote scope requires full_remote to be true",
      });
    }

    if (
      value.work_location_scope === "restricted" &&
      value.work_location_note === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["work_location_note"],
        message: "Restricted work locations require a note",
      });
    }

    if (
      value.work_location_scope !== "restricted" &&
      value.work_location_note !== null
    ) {
      context.addIssue({
        code: "custom",
        path: ["work_location_note"],
        message: "A work location note is only valid for restricted scope",
      });
    }

    if (value.office_required === "yes" && value.office_note === null) {
      context.addIssue({
        code: "custom",
        path: ["office_note"],
        message: "Required office attendance requires a note",
      });
    }

    if (value.office_required !== "yes" && value.office_note !== null) {
      context.addIssue({
        code: "custom",
        path: ["office_note"],
        message: "An office note is only valid when attendance is required",
      });
    }

    const evidenceFields = new Set(value.evidence.map(({ field }) => field));
    const requiredEvidence = new Set<(typeof aiEvidenceFields)[number]>();

    if (value.full_remote !== null) requiredEvidence.add("full_remote");
    if (value.remote_scope !== "unknown") requiredEvidence.add("remote_scope");
    if (value.work_location_scope !== "unknown") {
      requiredEvidence.add("work_location_scope");
    }
    if (value.work_location_note !== null) {
      requiredEvidence.add("work_location_note");
    }
    if (value.office_required !== "unknown") {
      requiredEvidence.add("office_required");
    }
    if (value.office_note !== null) requiredEvidence.add("office_note");
    if (value.recruiting_status !== "unknown") {
      requiredEvidence.add("recruiting_status");
    }

    for (const field of requiredEvidence) {
      if (!evidenceFields.has(field)) {
        context.addIssue({
          code: "custom",
          path: ["evidence"],
          message: `Missing evidence for ${field}`,
        });
      }
    }
  });

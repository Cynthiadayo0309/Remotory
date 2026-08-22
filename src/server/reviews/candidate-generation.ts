import { aiRemotePolicyAnalysisSchema } from "@/server/ai/schema";
import type { AiRemotePolicyAnalysis } from "@/server/ai/types";
import type { ChangeCandidateField, Company } from "@/types/company";
import {
  createCompanyChangeCandidateSchema,
  idSchema,
  type CreateCompanyChangeCandidateInput,
} from "@/validation/company";

type CandidateEvidenceField = ChangeCandidateField | "full_remote";

export type CandidateGenerationIssueReason =
  | "unknown_value_not_actionable"
  | "missing_evidence"
  | "full_remote_not_confirmed";

export interface CandidateGenerationIssue {
  field: CandidateEvidenceField;
  reason: CandidateGenerationIssueReason;
}

export interface CandidateGenerationResult {
  candidates: CreateCompanyChangeCandidateInput[];
  issues: CandidateGenerationIssue[];
}

interface CandidateDescriptor {
  field: ChangeCandidateField;
  oldValue: string | null;
  newValue: string | null;
  evidenceFields: CandidateEvidenceField[];
  unknownValue?: string;
}

function evidenceFor(
  analysis: AiRemotePolicyAnalysis,
  fields: CandidateEvidenceField[],
) {
  return analysis.evidence.filter(({ field }) => fields.includes(field));
}

function descriptorList(
  company: Company,
  analysis: AiRemotePolicyAnalysis,
): CandidateDescriptor[] {
  return [
    {
      field: "remote_scope",
      oldValue: company.remoteScope,
      newValue: analysis.remote_scope,
      evidenceFields: ["remote_scope"],
      unknownValue: "unknown",
    },
    {
      field: "work_location_scope",
      oldValue: company.workLocationScope,
      newValue: analysis.work_location_scope,
      evidenceFields: ["work_location_scope"],
      unknownValue: "unknown",
    },
    {
      field: "work_location_note",
      oldValue: company.workLocationNote,
      newValue: analysis.work_location_note,
      evidenceFields:
        analysis.work_location_note === null
          ? ["work_location_scope"]
          : ["work_location_note"],
    },
    {
      field: "office_required",
      oldValue: company.officeRequired,
      newValue: analysis.office_required,
      evidenceFields: ["office_required"],
      unknownValue: "unknown",
    },
    {
      field: "office_note",
      oldValue: company.officeNote,
      newValue: analysis.office_note,
      evidenceFields:
        analysis.office_note === null ? ["office_required"] : ["office_note"],
    },
    {
      field: "recruiting_status",
      oldValue: company.recruitingStatus,
      newValue: analysis.recruiting_status,
      evidenceFields: ["recruiting_status"],
      unknownValue: "unknown",
    },
  ];
}

export function generateCompanyChangeCandidates(input: {
  company: Company;
  checkId: string;
  analysis: AiRemotePolicyAnalysis;
}): CandidateGenerationResult {
  const checkId = idSchema.parse(input.checkId);
  const analysis = aiRemotePolicyAnalysisSchema.parse(input.analysis);
  const candidates: CreateCompanyChangeCandidateInput[] = [];
  const issues: CandidateGenerationIssue[] = [];

  if (analysis.full_remote === false) {
    issues.push({
      field: "full_remote",
      reason: "full_remote_not_confirmed",
    });
  }

  for (const descriptor of descriptorList(input.company, analysis)) {
    if (descriptor.oldValue === descriptor.newValue) continue;

    if (
      descriptor.unknownValue !== undefined &&
      descriptor.newValue === descriptor.unknownValue
    ) {
      issues.push({
        field: descriptor.field,
        reason: "unknown_value_not_actionable",
      });
      continue;
    }

    const evidence = evidenceFor(analysis, descriptor.evidenceFields);
    if (evidence.length === 0) {
      issues.push({ field: descriptor.field, reason: "missing_evidence" });
      continue;
    }

    const primaryEvidence = evidence[0];
    if (!primaryEvidence) {
      issues.push({ field: descriptor.field, reason: "missing_evidence" });
      continue;
    }
    const candidate = createCompanyChangeCandidateSchema.parse({
      companyId: input.company.id,
      checkId,
      fieldName: descriptor.field,
      oldValue: descriptor.oldValue,
      newValue: descriptor.newValue,
      evidenceText: primaryEvidence.text,
      sourceUrl: primaryEvidence.source_url,
      confidence: analysis.confidence,
    });
    candidates.push(candidate);
  }

  return { candidates, issues };
}

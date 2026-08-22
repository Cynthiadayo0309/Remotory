export const aiRemotePolicyJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    full_remote: { type: ["boolean", "null"] },
    remote_scope: { type: "string", enum: ["all", "partial", "unknown"] },
    work_location_scope: {
      type: "string",
      enum: ["nationwide", "restricted", "unknown"],
    },
    work_location_note: { type: ["string", "null"], maxLength: 500 },
    office_required: { type: "string", enum: ["yes", "no", "unknown"] },
    office_note: { type: ["string", "null"], maxLength: 500 },
    recruiting_status: {
      type: "string",
      enum: ["open", "closed", "unknown"],
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    evidence: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          field: {
            type: "string",
            enum: [
              "full_remote",
              "remote_scope",
              "work_location_scope",
              "work_location_note",
              "office_required",
              "office_note",
              "recruiting_status",
            ],
          },
          text: { type: "string", minLength: 1, maxLength: 500 },
          source_url: { type: "string", format: "uri" },
        },
        required: ["field", "text", "source_url"],
      },
    },
  },
  required: [
    "full_remote",
    "remote_scope",
    "work_location_scope",
    "work_location_note",
    "office_required",
    "office_note",
    "recruiting_status",
    "confidence",
    "evidence",
  ],
} as const;

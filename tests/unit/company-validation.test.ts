import { describe, expect, it } from "vitest";

import {
  createCompanyChangeCandidateSchema,
  createCompanySchema,
  createCompanySourceSchema,
  updateCompanySchema,
} from "@/validation/company";

describe("company validation", () => {
  it("applies safe defaults to new companies", () => {
    const company = createCompanySchema.parse({
      slug: "sample-company",
      name: "サンプル株式会社",
    });
    expect(company).toMatchObject({
      remoteScope: "unknown",
      workLocationScope: "unknown",
      officeRequired: "unknown",
      recruitingStatus: "unknown",
      publicationStatus: "needs_review",
    });
  });

  it("rejects non-http source URLs and empty updates", () => {
    expect(() =>
      createCompanySourceSchema.parse({
        companyId: crypto.randomUUID(),
        sourceType: "official",
        url: "file:///etc/passwd",
      }),
    ).toThrow();
    expect(() => updateCompanySchema.parse({})).toThrow();
  });

  it("restricts AI change candidates to managed public fields", () => {
    expect(() =>
      createCompanyChangeCandidateSchema.parse({
        companyId: crypto.randomUUID(),
        fieldName: "publication_status",
        newValue: "published",
      }),
    ).toThrow();
  });
});

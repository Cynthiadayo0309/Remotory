import { describe, expect, it } from "vitest";

import {
  adminCreateCompanySchema,
  adminCreateCompanySourceSchema,
  adminUpdateCompanySchema,
} from "@/features/admin/companies/admin-company-validation";

const input = {
  slug: "fictional-company",
  name: "架空企業株式会社",
  description: null,
  officialUrl: null,
  recruitUrl: null,
  industry: null,
  remoteScope: "unknown",
  workLocationScope: "unknown",
  workLocationNote: null,
  officeRequired: "unknown",
  officeNote: null,
  recruitingStatus: "unknown",
} as const;

describe("admin company validation", () => {
  it("forces newly registered companies to start in needs_review", () => {
    expect(adminCreateCompanySchema.parse(input).publicationStatus).toBe(
      "needs_review",
    );
    expect(
      adminCreateCompanySchema.safeParse({
        ...input,
        publicationStatus: "published",
      }).success,
    ).toBe(false);
  });

  it("allows an administrator to update publication status explicitly", () => {
    expect(
      adminUpdateCompanySchema.parse({
        ...input,
        publicationStatus: "hidden",
      }).publicationStatus,
    ).toBe("hidden");
  });

  it("accepts only http or https source URLs", () => {
    expect(
      adminCreateCompanySourceSchema.safeParse({
        sourceType: "recruit",
        url: "https://example.com/careers",
        isActive: true,
      }).success,
    ).toBe(true);
    expect(
      adminCreateCompanySourceSchema.safeParse({
        sourceType: "recruit",
        url: "file:///etc/passwd",
        isActive: true,
      }).success,
    ).toBe(false);
  });
});

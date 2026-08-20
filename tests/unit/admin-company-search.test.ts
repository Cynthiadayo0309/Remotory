import { describe, expect, it } from "vitest";

import {
  buildAdminCompanyHref,
  parseAdminCompanySearchParams,
} from "@/features/admin/companies/admin-company-search";

describe("admin company search", () => {
  it("parses supported filters and pagination", () => {
    expect(
      parseAdminCompanySearchParams({
        q: " 架空 ",
        publication: "published",
        recruiting: "open",
        page: "3",
      }),
    ).toEqual({
      keyword: "架空",
      publicationStatus: "published",
      recruitingStatus: "open",
      needsReviewOnly: false,
      page: 3,
    });
  });

  it("makes needs-review-only override the publication filter", () => {
    expect(
      parseAdminCompanySearchParams({
        publication: "published",
        needsReview: "1",
      }),
    ).toMatchObject({
      publicationStatus: "needs_review",
      needsReviewOnly: true,
    });
  });

  it("falls back safely for invalid query values", () => {
    expect(
      parseAdminCompanySearchParams({ publication: "invalid", page: "-3" }),
    ).toEqual({ needsReviewOnly: false, page: 1 });
  });

  it("keeps filters in pagination links", () => {
    expect(
      buildAdminCompanyHref(
        {
          keyword: "架空企業",
          publicationStatus: "needs_review",
          recruitingStatus: "open",
          needsReviewOnly: true,
          page: 1,
        },
        2,
      ),
    ).toBe(
      "/admin/companies?q=%E6%9E%B6%E7%A9%BA%E4%BC%81%E6%A5%AD&recruiting=open&needsReview=1&page=2",
    );
  });
});

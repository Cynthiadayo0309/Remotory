import { describe, expect, it } from "vitest";

import {
  buildPublicCompanySearchHref,
  parsePublicCompanySearchParams,
} from "@/features/companies/public-company-search";

describe("public company search", () => {
  it("parses supported query parameters", () => {
    expect(
      parsePublicCompanySearchParams({
        q: " リモート ",
        recruiting: "open",
        location: "nationwide",
        industry: "ソフトウェア",
        page: "3",
      }),
    ).toEqual({
      keyword: "リモート",
      recruitingStatus: "open",
      workLocationScope: "nationwide",
      industry: "ソフトウェア",
      page: 3,
    });
  });

  it("falls back safely for unsupported values", () => {
    expect(
      parsePublicCompanySearchParams({
        recruiting: "private",
        location: "somewhere",
        page: "-1",
      }),
    ).toEqual({
      keyword: undefined,
      recruitingStatus: undefined,
      workLocationScope: undefined,
      industry: undefined,
      page: 1,
    });
  });

  it("preserves filters in a load-more URL", () => {
    expect(
      buildPublicCompanySearchHref(
        {
          keyword: "remote team",
          recruitingStatus: "open",
          workLocationScope: "nationwide",
          industry: "SaaS",
          page: 1,
        },
        2,
      ),
    ).toBe(
      "/?q=remote+team&recruiting=open&location=nationwide&industry=SaaS&page=2",
    );
  });
});

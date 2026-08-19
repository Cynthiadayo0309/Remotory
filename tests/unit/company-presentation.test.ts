import { describe, expect, it } from "vitest";

import { formatVerifiedDate } from "@/features/companies/presentation";

describe("company presentation", () => {
  it("formats verification dates in Japan time", () => {
    expect(formatVerifiedDate("2026-08-18T15:00:00.000Z")).toBe(
      "2026年8月19日",
    );
  });

  it("shows a stable fallback when no verification date exists", () => {
    expect(formatVerifiedDate(null)).toBe("確認中");
  });
});

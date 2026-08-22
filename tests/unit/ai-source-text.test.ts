import { describe, expect, it } from "vitest";

import { prepareAiSourceText } from "@/server/ai/source-text";

describe("prepareAiSourceText", () => {
  it("keeps short normalized text unchanged", () => {
    expect(prepareAiSourceText("フルリモート勤務が可能です。", 100)).toEqual({
      text: "フルリモート勤務が可能です。",
      originalChars: 14,
      truncated: false,
    });
  });

  it("keeps leading context and relevant passages within the limit", () => {
    const text = `${"概要。".repeat(1_000)}${"一般情報。".repeat(1_000)}勤務地は日本全国です。フルリモート勤務が可能です。`;
    const prepared = prepareAiSourceText(text, 3_000);

    expect(prepared.truncated).toBe(true);
    expect(prepared.originalChars).toBe(text.length);
    expect(prepared.text.length).toBeLessThanOrEqual(3_000);
    expect(prepared.text.startsWith("概要。"));
    expect(prepared.text).toContain("勤務地は日本全国です");
  });

  it("falls back to leading content when no relevant term is present", () => {
    const text = "会社概要".repeat(1_000);
    const prepared = prepareAiSourceText(text, 120);

    expect(prepared.text).toBe(text.slice(0, 120));
    expect(prepared.truncated).toBe(true);
  });

  it("rejects an invalid character limit", () => {
    expect(() => prepareAiSourceText("text", 0)).toThrow(RangeError);
  });
});

import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";

describe("application metadata", () => {
  it("uses the Remotory product name and Japanese description", () => {
    expect(siteConfig.name).toBe("Remotory");
    expect(siteConfig.description).toContain("フルリモート勤務が可能な企業");
  });
});

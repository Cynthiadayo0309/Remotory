import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", heading: "フルリモートで働ける企業を探す" },
  { path: "/companies/remote-leaf", heading: "株式会社リモートリーフ" },
  { path: "/criteria", heading: "掲載基準" },
  { path: "/about", heading: "Remotoryについて" },
  { path: "/admin", heading: "管理ダッシュボード" },
  { path: "/admin/update", heading: "全企業の情報を更新" },
] as const;

for (const route of routes) {
  test(`${route.path} has no detectable WCAG A/AA violations`, async ({
    page,
  }) => {
    await page.goto(route.path);
    await expect(
      page.getByRole("heading", { name: route.heading }),
    ).toBeVisible();

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}

test("skip link moves keyboard focus to the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "本文へスキップ" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

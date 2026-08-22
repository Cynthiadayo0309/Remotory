import { expect, test } from "@playwright/test";

const publicPages = [
  { name: "home", path: "/", heading: "フルリモートで働ける企業を探す" },
  {
    name: "company-detail",
    path: "/companies/remote-leaf",
    heading: "株式会社リモートリーフ",
  },
  { name: "criteria", path: "/criteria", heading: "掲載基準" },
  { name: "about", path: "/about", heading: "Remotoryについて" },
] as const;

const localAdminPages = [
  { name: "admin", path: "/admin", heading: "管理ダッシュボード" },
  {
    name: "admin-update",
    path: "/admin/update",
    heading: "全企業の情報を更新",
  },
] as const;

const pages = process.env.PLAYWRIGHT_BASE_URL
  ? publicPages
  : [...publicPages, ...localAdminPages];

for (const target of pages) {
  test(`${target.name} is responsive and captures a screenshot`, async ({
    page,
  }, testInfo) => {
    await page.goto(target.path);
    await expect(
      page.getByRole("heading", { name: target.heading }),
    ).toBeVisible();
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
        nextjs-portal { display: none !important; }
      `,
    });

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    const screenshot = testInfo.outputPath(`${target.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await testInfo.attach(`${target.name}-${testInfo.project.name}`, {
      path: screenshot,
      contentType: "image/png",
    });
  });
}

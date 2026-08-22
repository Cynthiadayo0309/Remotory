import { expect, test } from "@playwright/test";

test("search filters are persisted in the URL and applied by the server", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "キーワード" }).fill("リモート");
  await page.getByLabel("募集状況").selectOption("open");
  await page.getByLabel("勤務地域").selectOption("nationwide");
  await page.getByLabel("業種").selectOption("ソフトウェア");
  await page.getByRole("button", { name: "検索する" }).click();

  await expect(page).toHaveURL(/q=%E3%83%AA%E3%83%A2%E3%83%BC%E3%83%88/);
  await expect(page).toHaveURL(/recruiting=open/);
  await expect(page).toHaveURL(/location=nationwide/);
  await expect(page).toHaveURL(/industry=%E3%82%BD%E3%83%95%E3%83%88/);
  await expect(
    page.getByRole("link", { name: "株式会社リモートリーフ" }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByRole("searchbox", { name: "キーワード" })).toHaveValue(
    "リモート",
  );
});

test("published company details expose the primary official CTA", async ({
  page,
}) => {
  await page.goto("/companies/remote-leaf");
  await expect(
    page.getByRole("heading", { name: "株式会社リモートリーフ" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /公式採用サイトを見る/ }),
  ).toHaveAttribute("href", "https://example.com/remote-leaf/careers");
  await expect(
    page.getByRole("link", { name: "公式サイトを見る" }),
  ).toHaveAttribute("href", "https://example.com/remote-leaf");
});

test("SEO endpoints exclude private companies and admin routes", async ({
  request,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain("/companies/remote-leaf");
  expect(sitemapBody).not.toContain("/companies/next-wave-lab");
  expect(sitemapBody).not.toContain("/admin");

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain("Disallow: /");
});

test("public metadata provides a canonical URL and Japanese title", async ({
  page,
}) => {
  await page.goto("/criteria");
  await expect(page).toHaveTitle("掲載基準 | Remotory");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/criteria",
  );
});

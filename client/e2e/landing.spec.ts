import { expect, expectNoErrorScreen, test } from "./support/watch";

const PUBLIC_PAGES = ["/", "/pricing", "/about", "/blog", "/careers", "/community", "/contact", "/help", "/privacy", "/terms", "/security", "/status", "/login", "/signup", "/forgot-password"];

for (const path of PUBLIC_PAGES) {
  test(`public page ${path} opens with its content and no errors`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status(), `${path} answered`).toBeLessThan(400);
    await expect(page.locator("h1:visible, h2:visible").first()).toBeVisible();
    await expectNoErrorScreen(page);
  });
}

test("every link on the landing page goes somewhere real", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.locator("a[href]").evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
  const internal = [...new Set(hrefs.filter((href) => href.startsWith("/") && !href.startsWith("//")).map((href) => href.split("#")[0] || "/"))];
  expect(internal.length, "the landing page has links").toBeGreaterThan(3);
  for (const href of internal) {
    const response = await request.get(href, { maxRedirects: 5 });
    expect(response.status(), `link ${href}`).toBeLessThan(400);
  }
});

test("the landing page's main buttons lead to sign-up and pricing", async ({ page }) => {
  await page.goto("/");
  const start = page.getByRole("link", { name: /get started|start free|try it|sign up/iu }).first();
  await expect(start).toBeVisible();
  await start.click();
  await expect(page).toHaveURL(/\/(signup|login|dashboard)/u);
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("link", { name: /pricing/iu }).locator("visible=true").first().click();
  await expect(page).toHaveURL(/\/pricing/u);
});

test.describe("a first visit", () => {
  test.use({ returning: false });
  test("shows the cookie notice, and Accept closes it for good", async ({ page }) => {
    await page.goto("/");
    const notice = page.getByRole("region", { name: "Cookie notice" });
    await expect(notice).toBeVisible();
    await notice.getByRole("button", { name: "Accept" }).click();
    await expect(notice).toBeHidden();
    await page.reload();
    await expect(page.getByRole("region", { name: "Cookie notice" })).toBeHidden();
  });
});

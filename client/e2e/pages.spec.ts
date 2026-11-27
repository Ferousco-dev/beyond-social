import { ADMIN_STATE, USER_STATE } from "./support/stack";
import { expect, expectNoErrorScreen, test } from "./support/watch";

/** Every screen a signed-in person can reach. */
const APP_PAGES = [
  "/dashboard",
  "/dashboard/new",
  "/dashboard/videos/new",
  "/dashboard/projects",
  "/dashboard/assets",
  "/dashboard/trends",
  "/dashboard/schedule",
  "/dashboard/analytics",
  "/dashboard/settings/account",
  "/dashboard/settings/billing",
  "/dashboard/settings/connections",
  "/dashboard/settings/notifications",
];

const ADMIN_PAGES = [
  "/dashboard/admin",
  "/dashboard/admin/users",
  "/dashboard/admin/pricing",
  "/dashboard/admin/spend",
  "/dashboard/admin/providers",
  "/dashboard/admin/alerts",
  "/dashboard/admin/monitoring",
  "/dashboard/admin/blog",
];

test.describe("signed in", () => {
  test.use({ storageState: USER_STATE });
  for (const path of APP_PAGES) {
    test(`app page ${path} opens with no errors`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
      await expect(page).not.toHaveURL(/\/login/u);
      await expect(page.locator("h1:visible, h2:visible").first()).toBeVisible();
      await expectNoErrorScreen(page);
    });
  }

  test("a person who is not an admin cannot open the admin console", async ({ page }) => {
    await page.goto("/dashboard/admin");
    await expect(page.getByRole("heading", { name: "We could not find that page" }), "the console answers as if it did not exist").toBeVisible();
  });
});

test.describe("admin", () => {
  test.use({ storageState: ADMIN_STATE });
  for (const path of ADMIN_PAGES) {
    test(`admin page ${path} opens with no errors`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("h1:visible, h2:visible").first()).toBeVisible();
      await expectNoErrorScreen(page);
    });
  }
});

test("signed out, the app sends a person to sign in", async ({ page }) => {
  await page.goto("/dashboard/projects");
  await expect(page).toHaveURL(/\/login/u);
});

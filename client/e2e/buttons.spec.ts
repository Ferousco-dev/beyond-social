import { ADMIN_STATE, USER_STATE } from "./support/stack";
import { expectNoErrorScreen, test } from "./support/watch";
import { type Page } from "@playwright/test";

/** Buttons that change or spend something for real; their own flows are tested in the journey specs. */
const LEAVE_ALONE = /delete|remove|sign out|log out|suspend|restore|purchase|buy|upgrade|checkout|pay|generate|start generation|post to|schedule for|disconnect|reset|clear|send|approve|save to laptop|export|rotate|pause/iu;

async function pressEveryButton(page: Page, path: string): Promise<number> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const total = await page.getByRole("button").count();
  let pressed = 0;
  for (let index = 0; index < Math.min(total, 60); index++) {
    if (!page.url().includes(path)) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    const button = page.getByRole("button").nth(index);
    if (!(await button.isVisible().catch(() => false)) || !(await button.isEnabled().catch(() => false))) continue;
    const name = ((await button.getAttribute("aria-label")) ?? (await button.innerText().catch(() => ""))).trim();
    if (name === "" || LEAVE_ALONE.test(name)) continue;
    await button.click({ timeout: 5_000 }).catch(() => undefined);
    pressed++;
    await page.keyboard.press("Escape");
    await expectNoErrorScreen(page);
  }
  return pressed;
}

const APP = ["/dashboard", "/dashboard/new", "/dashboard/videos/new", "/dashboard/projects", "/dashboard/assets", "/dashboard/trends", "/dashboard/schedule", "/dashboard/settings/account", "/dashboard/settings/notifications", "/dashboard/settings/connections"];
const ADMIN = ["/dashboard/admin", "/dashboard/admin/users", "/dashboard/admin/pricing", "/dashboard/admin/spend", "/dashboard/admin/providers", "/dashboard/admin/alerts", "/dashboard/admin/monitoring"];

test.describe("every safe button in the app responds without breaking anything", () => {
  test.use({ storageState: USER_STATE });
  for (const path of APP) {
    test(`buttons on ${path}`, async ({ page }) => {
      test.setTimeout(180_000);
      await pressEveryButton(page, path);
    });
  }
});

test.describe("every safe button in the admin console responds", () => {
  test.use({ storageState: ADMIN_STATE });
  for (const path of ADMIN) {
    test(`buttons on ${path}`, async ({ page }) => {
      test.setTimeout(180_000);
      await pressEveryButton(page, path);
    });
  }
});

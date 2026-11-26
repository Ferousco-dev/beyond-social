import { expect, test as setup, type Page } from "@playwright/test";

import { codeFor } from "./support/mailbox";
import { ADMIN_STATE, PASSWORD, stack, USER_STATE } from "./support/stack";

/** Removes a test account left by an earlier run on the same local stack, so sign-up starts clean. */
async function removeLeftover(email: string): Promise<void> {
  const headers = { apikey: stack.serviceRoleKey, Authorization: `Bearer ${stack.serviceRoleKey}` };
  const listed = await fetch(`${stack.supabaseUrl}/auth/v1/admin/users?per_page=1000`, { headers });
  const { users } = (await listed.json()) as { users: { id: string; email: string }[] };
  for (const user of users.filter((u) => u.email === email)) {
    await fetch(`${stack.supabaseUrl}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers });
  }
}

/**
 * Signs up through the real form, confirms with the code from the mailbox,
 * and keeps the session for the other tests. The admin is the address the
 * API promotes (ADMIN_EMAILS in e2e/stack.sh).
 */
async function signUp(page: Page, email: string, name: string): Promise<void> {
  const started = new Date(Date.now() - 1000);
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("combobox").click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /create account|sign up/iu }).click();

  await page.waitForURL(/\/verify/u);
  const code = await codeFor(email, started);
  await page.getByRole("textbox").first().fill(code);
  await page.getByRole("button", { name: /verify|confirm|continue/iu }).click();
  await page.waitForURL(/\/(dashboard|welcome)/u);
}

setup("a new person signs up, confirms by email code and lands in the app", async ({ page }) => {
  await signUp(page, `person-${Date.now()}@e2e.test`, "Test Person");
  await page.context().storageState({ path: USER_STATE });
});

setup("the admin signs up the same way and is promoted", async ({ page }) => {
  await removeLeftover("admin@e2e.test");
  await signUp(page, "admin@e2e.test", "Test Admin");
  await page.goto("/dashboard/admin");
  await expect(page.getByRole("heading").first()).toBeVisible();
  await page.context().storageState({ path: ADMIN_STATE });
});

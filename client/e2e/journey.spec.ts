import { stack, USER_STATE } from "./support/stack";
import { expect, expectNoErrorScreen, test } from "./support/watch";

test.use({ storageState: USER_STATE });

/** How many times each fake provider was asked, so a test proves the real flow reached it. */
async function providerCalls(): Promise<Record<string, number>> {
  return (await (await fetch(`${stack.fakeUrl}/calls`)).json()) as Record<string, number>;
}

test("idea to finished video to post: the whole journey, with fake generation", async ({ page }) => {
  test.setTimeout(240_000);

  await page.goto("/dashboard/videos/new");
  const idea = page.getByPlaceholder(/promo for our new serum/iu);
  await idea.fill("A 15-second promo for a bakery's new chocolate cake");
  await page.getByRole("button", { name: "Generate video" }).last().click();

  const review = page.getByRole("dialog");
  await expect(review.getByText(/final review/iu)).toBeVisible({ timeout: 60_000 });
  await expect(review.getByText(/\d+ credits/iu)).toBeVisible();
  await review.getByRole("button", { name: "Generate video" }).click();
  await review.getByRole("button", { name: "Confirm and generate" }).click();

  await page.waitForURL(/\/editor\//u, { timeout: 60_000 });
  await expectNoErrorScreen(page);
  await expect(page.getByText(/added to your timeline/iu)).toBeVisible({ timeout: 120_000 });
  const calls = await providerCalls();
  expect(Object.keys(calls).some((name) => name.startsWith("kie.task")), "the fake video provider was asked to render").toBe(true);
  expect(calls.gemini ?? 0, "our AI wrote the brief").toBeGreaterThan(0);

  await expect(page.getByText(/^Saved$/u)).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: /^Export$/u }).click();
  const post = page.getByRole("dialog");
  await expect(post.getByText("Post your video")).toBeVisible();
  await expect(post.getByRole("button", { name: /save to laptop/iu })).toBeVisible();
  await post.getByRole("button", { name: /close/iu }).click();
});

test("the editor's AI chat, captions and speed all work on a clip", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/dashboard/projects");
  await page.locator('a[href^="/editor/"]').first().click();
  await page.waitForURL(/\/editor\//u);

  await page.getByRole("button", { name: /add a title at the start/iu }).click();
  await expect(page.getByText(/working/iu)).toHaveCount(0, { timeout: 60_000 });

  await page.getByRole("button", { name: /captions/iu }).first().click();
  await page.getByRole("button", { name: "Generate captions" }).click();
  await expect(page.getByRole("button", { name: "Generate captions" })).toBeEnabled({ timeout: 60_000 });
  await page.getByRole("button", { name: "Large" }).click();
  await expect(page.getByRole("button", { name: "Large" })).toHaveAttribute("aria-pressed", "true");

  await expect(page.getByText(/^Saved$/u)).toBeVisible({ timeout: 30_000 });
  await expectNoErrorScreen(page);
});

test("Discover finds posts for a topic", async ({ page }) => {
  await page.goto("/dashboard/trends");
  await page.getByRole("searchbox").or(page.getByRole("textbox")).first().fill("cake");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Showing \d+ of \d+ for/u)).toBeVisible({ timeout: 90_000 });
});

test("a notification setting stays switched after a reload", async ({ page }) => {
  await page.goto("/dashboard/settings/notifications");
  const toggle = page.getByRole("switch").first();
  const before = await toggle.getAttribute("aria-checked");
  await toggle.click();
  await expect(toggle).not.toHaveAttribute("aria-checked", before ?? "");
  await page.reload();
  await expect(page.getByRole("switch").first()).not.toHaveAttribute("aria-checked", before ?? "");
});

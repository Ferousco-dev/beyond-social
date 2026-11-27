import { expect, test as base, type Page } from "@playwright/test";

/** Messages the browser logs that are not the app's fault (the fake media host cannot be reached by the browser). */
const EXPECTED = [/media\.e2e\.test/u, /Failed to load resource: net::ERR_NAME_NOT_RESOLVED/u, /favicon/u];

/**
 * A test that fails on any uncaught page error, any console error, any
 * failed request to our own API, and any error screen, so a page that looks
 * fine but is quietly broken still fails.
 */
export const test = base.extend<{ answeredCookies: boolean; problems: string[] }>({
  /** Answer the cookie notice before the page loads, as a returning visitor has. Turn off to test the notice itself. */
  answeredCookies: [true, { option: true }],
  page: async ({ page, answeredCookies }, provide) => {
    if (answeredCookies) {
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem("bs:cookie-consent", "accepted");
        } catch {
          return;
        }
      });
    }
    await provide(page);
  },
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error" && !EXPECTED.some((pattern) => pattern.test(message.text()))) problems.push(`console: ${message.text()}`);
      });
      page.on("response", (response) => {
        if (response.status() >= 500 && /\/api\//u.test(response.url())) problems.push(`server error ${response.status()}: ${response.url()}`);
      });
      await use(problems);
      expect(problems, "the page logged errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Fails if the page shows an error screen instead of its content. */
export async function expectNoErrorScreen(page: Page): Promise<void> {
  await expect(page.getByText(/something went wrong|application error|this page could not be found/iu)).toHaveCount(0);
}

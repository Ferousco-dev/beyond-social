import { defineConfig, devices } from "@playwright/test";

import { stack } from "./e2e/support/stack";

/**
 * End-to-end tests against the local test stack (e2e/stack.sh up): a local
 * Supabase, the fake providers and the API, so nothing is generated or paid
 * for. Every failure keeps a trace, a screenshot and a video.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { outputFolder: "e2e/.report", open: "never" }]] : [["list"], ["html", { outputFolder: "e2e/.report", open: "never" }]],
  use: {
    baseURL: stack.webUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"], testIgnore: /.*\.setup\.ts/ },
    { name: "phone", use: { ...devices["Pixel 7"] }, dependencies: ["setup"], testMatch: /(landing|pages)\.spec\.ts/ },
  ],
});

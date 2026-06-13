import { defineConfig, devices } from "@playwright/test";

// BASE_URL lets the same specs run against a local dev server or the live Fly
// URL (used by `pnpm verify` for the integration scenarios in RUBRIC.md §3).
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const useLocalServer = !process.env.BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: useLocalServer
    ? {
        command: "pnpm build && pnpm start",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});

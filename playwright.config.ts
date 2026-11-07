import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /(drag-and-drop|live-sync)\.spec\.ts/,
    },
    // Moves rearrange the seeded Board other specs read, so they run after them.
    {
      name: "chromium-moves",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /drag-and-drop\.spec\.ts/,
      dependencies: ["chromium"],
    },
    // Live sync refreshes every open page on each write, so it runs alone, last.
    {
      name: "chromium-live",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /live-sync\.spec\.ts/,
      dependencies: ["chromium-moves"],
    },
  ],
  // A production build against the disposable `test` database, freshly seeded.
  webServer: {
    command: `tsx scripts/seed.ts --test --yes && EXPOSE_TESTING_API=1 next build && next start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      DIRECT_URL: process.env.TEST_DIRECT_URL ?? "",
    },
  },
});

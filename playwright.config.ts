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
      testIgnore: /(drag-and-drop|move-to|touch-drag|task-edit|create-task)\.spec\.ts/,
    },
    // Moves rearrange the seeded Board other specs read, so they run after them.
    {
      name: "chromium-moves",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /drag-and-drop\.spec\.ts/,
      dependencies: ["chromium"],
    },
    // "Move to…" is the phone's way to move a card, and it moves seeded cards too.
    {
      name: "mobile-moves",
      use: { ...devices["Pixel 7"] },
      testMatch: /move-to\.spec\.ts/,
      dependencies: ["chromium-moves"],
    },
    // Long-press dragging on a phone moves seeded cards as well.
    {
      name: "mobile-drag",
      use: { ...devices["Pixel 7"] },
      testMatch: /touch-drag\.spec\.ts/,
      dependencies: ["mobile-moves"],
    },
    // Task detail edits change the seeded Tasks the moves arrange, so they run last.
    {
      name: "chromium-edits",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /task-edit\.spec\.ts/,
      dependencies: ["mobile-drag"],
    },
    // Creates add Tasks to the seeded Board other specs count, so they run after all of them.
    {
      name: "chromium-creates",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /create-task\.spec\.ts/,
      dependencies: ["chromium-edits"],
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

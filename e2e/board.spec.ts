import { expect, test } from "@playwright/test";

// Runs against a production build on the freshly seeded `test` database.

test("shows the seeded Board in four Status columns", async ({ page }) => {
  await page.goto("/");

  const board = page.getByRole("region", { name: "Board" });
  const columns = board.getByRole("region");
  await expect(columns).toHaveCount(4);
  await expect(columns.getByRole("heading", { level: 2 })).toHaveText([
    "To Do",
    "In Progress",
    "In Review",
    "Done",
  ]);

  const inProgress = board.getByRole("region", { name: "In Progress" });
  await expect(inProgress.getByText("4 Tasks")).toBeVisible();
  await expect(inProgress.getByRole("article")).toHaveCount(4);
  await expect(inProgress.getByRole("article").first()).toHaveAccessibleName(
    "Fractional Rank for moves",
  );

  const card = board.getByRole("article", { name: "Fractional Rank for moves" });
  await expect(card.getByRole("button", { name: "Priority: Urgent" })).toBeVisible();
  await expect(card.getByText("Backend")).toBeVisible();
  await expect(card.getByRole("img", { name: "Assignee: Leo Okafor" })).toBeVisible();

  const noPriority = board.getByRole("article", {
    name: "Light, Dark and System themes",
  });
  // Priority None shows no glyph until the card is hovered, as in Jira.
  const nonePriority = noPriority.getByRole("button", { name: "Priority: None" });
  await expect(nonePriority.locator("svg")).toBeHidden();
  await noPriority.hover();
  await expect(nonePriority.locator("svg")).toBeVisible();
});

test("scrolls horizontally to every column below 640px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");

  const done = page.getByRole("region", { name: "Done" });
  await expect(done).not.toBeInViewport();
  await done.getByRole("article").first().scrollIntoViewIfNeeded();
  await expect(done.getByRole("article").first()).toBeInViewport();
});

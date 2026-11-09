import { expect, test, type Locator, type Page } from "@playwright/test";
import { setDemoControls } from "./demo-controls";

// Tests run in parallel on one seeded database and may run more than once on
// a reused server, so each test owns its own Task and works from the Priority
// it finds rather than the seeded one.

const CYCLE = ["None", "Low", "Medium", "High", "Urgent"];

/**
 * Opens the Board and waits for the visitor's Guest, which appears only once
 * the page has hydrated and the Guest exists, so clicks aren't lost.
 */
async function openBoard(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("group", { name: /^You are / })).toBeVisible();
}

function card(page: Page, title: string) {
  return page.getByRole("region", { name: "Board" }).getByRole("article", { name: title });
}

function priorityButton(card: Locator) {
  return card.getByRole("button", { name: /^Priority: / });
}

async function shownPriority(card: Locator) {
  const label = await priorityButton(card).getAttribute("aria-label");
  return label!.replace("Priority: ", "");
}

/** The Priority `clicks` steps after `from` in the cycle. */
function after(from: string, clicks: number) {
  return CYCLE[(CYCLE.indexOf(from) + clicks) % CYCLE.length];
}

test("clicking Priority updates instantly and the saved value survives a reload", async ({
  page,
}) => {
  await openBoard(page);
  const task = card(page, "Optimistic priority cycling");
  const before = await shownPriority(task);

  await priorityButton(task).click();

  await expect(priorityButton(task)).toHaveAccessibleName(`Priority: ${after(before, 1)}`);
  await expect(priorityButton(task)).not.toHaveAttribute("data-pending");
  await page.reload();
  await expect(priorityButton(task)).toHaveAccessibleName(`Priority: ${after(before, 1)}`);
});

test("rapid repeated clicks end on the last value shown", async ({ page }) => {
  await openBoard(page);
  const task = card(page, "Rate limit the Server Actions");
  const before = await shownPriority(task);

  for (let i = 0; i < 3; i++) await priorityButton(task).click();

  await expect(priorityButton(task)).toHaveAccessibleName(`Priority: ${after(before, 3)}`);
  await expect(priorityButton(task)).not.toHaveAttribute("data-pending");
  await page.reload();
  await expect(priorityButton(task)).toHaveAccessibleName(`Priority: ${after(before, 3)}`);
});

test("with Always fail and 1s latency, a click shows pending, then rolls back with a toast", async ({
  page,
  context,
}) => {
  await openBoard(page);
  await setDemoControls(page, context, { latency: "1s", failure: "Always" });
  const task = card(page, "Command palette with ⌘K");
  const before = await shownPriority(task);

  await priorityButton(task).click();

  // Optimistic, and pending for the added latency.
  await expect(priorityButton(task)).toHaveAccessibleName(`Priority: ${after(before, 1)}`);
  await expect(priorityButton(task)).toHaveAttribute("data-pending");
  // Then the failure: rolled back, with an explanation.
  await expect(page.getByText("Couldn't change the Priority")).toBeVisible();
  await expect(page.getByText("Simulated failure (demo controls).")).toBeVisible();
  await expect(priorityButton(task)).toHaveAccessibleName(`Priority: ${before}`);
  await page.reload();
  await expect(priorityButton(task)).toHaveAccessibleName(`Priority: ${before}`);
});

test("demo controls persist across reloads", async ({ page, context }) => {
  await openBoard(page);
  await setDemoControls(page, context, { latency: "3s", failure: "30% random" });

  await page.reload();
  await page.getByRole("button", { name: "Demo controls (active)" }).click();

  const dialog = page.getByRole("dialog", { name: "Demo controls" });
  await expect(dialog.getByRole("radio", { name: "3s" })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: "30% random" })).toBeChecked();
});

test("another browser's demo controls are unaffected", async ({ page, context, browser }) => {
  await openBoard(page);
  await setDemoControls(page, context, { latency: "Off", failure: "Always" });

  const other = await browser.newContext();
  try {
    const otherPage = await other.newPage();
    await openBoard(otherPage);
    await expect(otherPage.getByRole("button", { name: "Demo controls" })).toBeVisible();
    const task = card(otherPage, "Label Filter in the URL");
    const before = await shownPriority(task);

    await priorityButton(task).click();

    await expect(priorityButton(task)).not.toHaveAttribute("data-pending");
    await otherPage.reload();
    await expect(priorityButton(task)).toHaveAccessibleName(`Priority: ${after(before, 1)}`);
  } finally {
    await other.close();
  }
});

test("a pending Priority change dims nothing but its own button", async ({ page, context }) => {
  await openBoard(page);
  await setDemoControls(page, context, { latency: "1s", failure: "Off" });
  const task = card(page, "Jira-style drop line for drag and drop");

  await priorityButton(task).click();

  await expect(priorityButton(task)).toHaveAttribute("data-pending");
  // Sampled once, mid-way through the 1s latency and after any fade would
  // have finished; a retrying assertion would pass once the change settles.
  await page.waitForTimeout(400);
  const opacity = await page
    .getByRole("region", { name: "Board" })
    .evaluate((el) => getComputedStyle(el).opacity);
  await expect(priorityButton(task)).toHaveAttribute("data-pending");
  expect(opacity).toBe("1");
  await expect(priorityButton(task)).not.toHaveAttribute("data-pending");
});

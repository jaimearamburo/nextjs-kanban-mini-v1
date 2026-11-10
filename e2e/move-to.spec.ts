import { expect, test, type Page } from "@playwright/test";
import { setDemoControls } from "./demo-controls";

// Runs on a phone (see playwright.config.ts). Moves rearrange the shared
// seeded Board, so these tests run one at a time, after the specs that read
// it, and each puts its card back where it found it: the card starts at the
// top of In Review, and "Move to…" puts a Task at the top.
test.describe.configure({ mode: "serial" });

const TITLE = "Fix the modal not closing on back";

async function openBoard(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("group", { name: /^You are / })).toBeVisible();
}

function column(page: Page, status: string) {
  return page.getByRole("region", { name: "Board" }).getByRole("region", { name: status });
}

function card(page: Page, title: string) {
  return page.getByRole("region", { name: "Board" }).getByRole("article", { name: title });
}

function topCard(page: Page, status: string) {
  return column(page, status).getByRole("article").first();
}

/** Opens a card's "Move to…" menu and waits until it has finished opening, as a finger would. */
async function openMoveTo(page: Page, title: string) {
  await card(page, title).getByRole("button", { name: "Move to…" }).tap();
  const menu = page.getByRole("menu");
  await expect.poll(() => menu.evaluate((element) => element.getAnimations().length)).toBe(0);
  return menu;
}

/** Picks a Status from a card's "Move to…" menu. */
async function moveTo(page: Page, title: string, status: string) {
  const menu = await openMoveTo(page, title);
  await menu.getByRole("menuitem", { name: status }).tap();
}

test("Move to… lists the other Statuses, puts the card at the top of the one picked at once, and it stays after a reload", async ({
  page,
  context,
}) => {
  await openBoard(page);
  // A slow save, so the card can be seen moved before the server answers.
  await setDemoControls(page, context, { latency: "1s", failure: "Off" });

  const menu = await openMoveTo(page, TITLE);
  await expect(menu.getByRole("menuitem")).toHaveText(["To Do", "In Progress", "Done"]);
  await menu.getByRole("menuitem", { name: "Done" }).tap();

  await expect(topCard(page, "Done")).toHaveAccessibleName(TITLE);
  await expect(card(page, TITLE)).toHaveAttribute("data-pending");
  await expect(card(page, TITLE)).not.toHaveAttribute("data-pending");

  await page.reload();
  await expect(topCard(page, "Done")).toHaveAccessibleName(TITLE);

  await moveTo(page, TITLE, "In Review");
  await expect(card(page, TITLE)).not.toHaveAttribute("data-pending");
  await expect(topCard(page, "In Review")).toHaveAccessibleName(TITLE);
});

test("a refused Move to… puts the card back and says why", async ({ page, context }) => {
  await openBoard(page);
  await setDemoControls(page, context, { latency: "Off", failure: "Always" });

  await moveTo(page, TITLE, "Done");

  await expect(page.getByText("Couldn't move the Task")).toBeVisible();
  await expect(topCard(page, "In Review")).toHaveAccessibleName(TITLE);
  await expect(column(page, "Done").getByRole("article", { name: TITLE })).toHaveCount(0);
});

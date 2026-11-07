import { instant } from "@next/playwright";
import { expect, test, type Page } from "@playwright/test";

// Runs against a production build on the freshly seeded `test` database.
// These tests only read, so they can share seeded Tasks.

const TITLE = "Fix the modal not closing on back";
const DESCRIPTION =
  "Pressing the browser back button should close the Task modal and return to the Board as it was.";
const TASK_URL = /\/tasks\/[0-9a-f-]{36}$/;

/** Opens the Board and waits until it has hydrated, so card clicks are client-side. */
async function openBoard(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("group", { name: /^You are / })).toBeVisible();
}

function board(page: Page) {
  return page.getByRole("region", { name: "Board" });
}

function cardLink(page: Page, title: string) {
  return board(page).getByRole("article", { name: title }).getByRole("link", { name: title });
}

/** Asserts the Task detail shows the seeded Task's read-only fields. */
async function expectSeededTask(detail: ReturnType<Page["getByRole"]>) {
  await expect(detail.getByRole("heading", { name: TITLE })).toBeVisible();
  await expect(detail.getByText(DESCRIPTION)).toBeVisible();
  await expect(detail.getByText("In Review")).toBeVisible();
  await expect(detail.getByText("Urgent")).toBeVisible();
  await expect(detail.getByText("Sam Rivera")).toBeVisible();
  await expect(detail.getByText("Bug")).toBeVisible();
  await expect(detail.getByText("Frontend")).toBeVisible();
  await expect(detail.getByRole("region", { name: "Comments" })).toBeVisible();
  await expect(detail.getByRole("region", { name: "Activity" })).toBeVisible();
}

test("clicking a card opens the Task in a modal over the Board and changes the URL", async ({
  page,
}) => {
  await openBoard(page);

  await cardLink(page, TITLE).click();

  await expect(page).toHaveURL(TASK_URL);
  const modal = page.getByRole("dialog", { name: TITLE });
  await expectSeededTask(modal);
  // The Board stays rendered behind the modal, hidden from assistive tech
  // while the modal is open.
  await expect(
    page
      .getByRole("region", { name: "Board", includeHidden: true })
      .getByRole("article", { name: TITLE, includeHidden: true }),
  ).toBeVisible();
});

test("only the title opens the Task: a click elsewhere on the card does nothing", async ({
  page,
}) => {
  await openBoard(page);
  const card = board(page).getByRole("article", { name: TITLE });

  // The Labels, between the title and the Priority control. Forced, so the
  // click lands wherever a person's would, even on an element covering them.
  await card.getByRole("list", { name: "Labels" }).click({ force: true });

  // Give a navigation time to start: asserting "still on the Board" at once
  // would pass before any click could take effect.
  await page.waitForTimeout(500);
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the Task opens instantly from a card, with no wait on the server", async ({ page }) => {
  // Live sync off: another spec's write would refresh this page, and inside
  // instant() that refresh is blocked until the scope ends.
  await page.route("**/api/realtime/token", (route) => route.abort());
  await openBoard(page);

  // Inside instant(), only what was prefetched can show: anything the click
  // still had to fetch from the server stays blocked until the scope ends.
  await instant(page, async () => {
    await cardLink(page, TITLE).click();
    await page.waitForURL(TASK_URL);
    await expectSeededTask(page.getByRole("dialog", { name: TITLE }));
  });
});

test("the Task opens as a side panel below the header, covering three quarters of the width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openBoard(page);
  const header = await page.getByRole("banner").boundingBox();

  await cardLink(page, TITLE).click();

  const panel = page.getByRole("dialog", { name: TITLE });
  await expect(panel).toBeVisible();
  // Wait for the slide-in to finish before measuring.
  await expect(async () => {
    const box = (await panel.boundingBox())!;
    expect(box.x + box.width).toBe(1280);
    expect(box.width).toBe(960);
    expect(box.y).toBe(header!.y + header!.height);
    expect(box.y + box.height).toBe(800);
  }).toPass();
  // The Board behind is dimmed and very lightly blurred.
  await expect(page.locator(".fixed[role=presentation]")).toHaveCSS(
    "backdrop-filter",
    "blur(2px)",
  );
  // The panel scrolls on its own; the Board behind it doesn't move.
  expect(await panel.evaluate((el) => getComputedStyle(el).overflowY)).toBe("auto");
});

for (const { width, layout } of [
  { width: 1600, layout: "beside the Task" },
  { width: 900, layout: "under Comments" },
] as const) {
  test(`at ${width}px wide, Activity shows ${layout}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openBoard(page);

    await cardLink(page, TITLE).click();

    const panel = page.getByRole("dialog", { name: TITLE });
    const comments = panel.getByRole("region", { name: "Comments" });
    const activity = panel.getByRole("region", { name: "Activity" });
    await expect(activity).toBeVisible();
    await expect(async () => {
      const c = (await comments.boundingBox())!;
      const a = (await activity.boundingBox())!;
      if (layout === "beside the Task") {
        expect(a.x).toBeGreaterThanOrEqual(c.x + c.width);
        expect(a.y).toBeLessThan(c.y);
        // Its divider runs the panel's full height, from just under the
        // header to the bottom edge.
        const p = (await panel.boundingBox())!;
        const column = (await activity.locator("..").boundingBox())!;
        expect(column.y).toBe(p.y);
        expect(column.y + column.height).toBe(p.y + p.height);
      } else {
        expect(a.x).toBe(c.x);
        expect(a.y).toBeGreaterThanOrEqual(c.y + c.height);
      }
    }).toPass();
  });
}

test("loading or refreshing a Task URL shows the full Task page", async ({ page }) => {
  await openBoard(page);
  await cardLink(page, TITLE).click();
  await expect(page).toHaveURL(TASK_URL);
  const url = page.url();

  await page.reload();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(board(page)).toHaveCount(0);
  await expectSeededTask(page.getByRole("main"));
  await expect(page.getByRole("link", { name: "Back to the Board" })).toBeVisible();

  await page.goto(url);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expectSeededTask(page.getByRole("main"));
});

for (const [how, close] of [
  ["Esc", (page: Page) => page.keyboard.press("Escape")],
  // The Board's uncovered left quarter, below the header.
  ["the backdrop", (page: Page) => page.mouse.click(100, 400)],
  ["the back button", (page: Page) => page.goBack()],
] as const) {
  test(`closing with ${how} returns to the Board with its scroll position kept`, async ({
    page,
  }) => {
    // Narrow enough that the Board scrolls horizontally to reach Done, wide
    // enough that the side panel leaves part of the Board uncovered.
    await page.setViewportSize({ width: 900, height: 800 });
    await openBoard(page);
    const done = board(page).getByRole("region", { name: "Done" });
    const doneCard = done.getByRole("article").first();
    await doneCard.scrollIntoViewIfNeeded();
    const scrollLeft = await board(page).evaluate((el) => el.scrollLeft);
    expect(scrollLeft).toBeGreaterThan(0);
    const title = (await doneCard.getAttribute("aria-label"))!;

    await cardLink(page, title).click();
    await expect(page.getByRole("dialog", { name: title })).toBeVisible();
    await close(page);

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
    await expect(doneCard).toBeInViewport();
    expect(await board(page).evaluate((el) => el.scrollLeft)).toBe(scrollLeft);
  });
}

for (const id of ["00000000-0000-7000-8000-000000000000", "not-a-task"]) {
  test(`an unknown Task id (${id}) shows Task not found`, async ({ page }) => {
    await page.goto(`/tasks/${id}`);

    await expect(page.getByRole("heading", { name: "Task not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to the Board" })).toBeVisible();
  });
}

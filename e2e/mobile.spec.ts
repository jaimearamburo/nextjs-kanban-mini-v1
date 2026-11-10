import { devices, expect, test, type Locator, type Page } from "@playwright/test";

// A phone: touch, so `pointer: coarse` matches. Not the whole device:
// its defaultBrowserType can't be set inside a describe.
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"];
const phone = { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch };

/** The tap target a finger gets: the element's box, at least 40px in both directions. */
const MIN_TARGET = 40;

async function size(control: Locator) {
  const box = await control.boundingBox();
  expect(box, "control is on screen").not.toBeNull();
  return box!;
}

async function fontSize(control: Locator) {
  return control.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
}

async function expectTouchSized(control: Locator) {
  const box = await size(control);
  expect.soft(box.height, "height").toBeGreaterThanOrEqual(MIN_TARGET);
  expect.soft(box.width, "width").toBeGreaterThanOrEqual(MIN_TARGET);
}

/** The page is no wider than the phone: anything wider shows as a blank gap once iOS zooms. */
async function expectNoSidewaysPage(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBe(0);
}

/** At least 16px, so iOS Safari doesn't zoom the page on focus. */
async function expectNoFocusZoom(field: Locator) {
  expect.soft(await fontSize(field), "font size").toBeGreaterThanOrEqual(16);
}

async function openBoard(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("group", { name: /^You are / })).toBeVisible();
}

test.describe("on a phone", () => {
  test.use(phone);

  test("the page never scrolls sideways; only the Board does", async ({ page }) => {
    await openBoard(page);
    await expect(page.getByRole("article").first()).toBeVisible();
    await expectNoSidewaysPage(page);

    await page.goto("/tasks/new");
    await expect(page.getByRole("button", { name: "Create Task" })).toBeVisible();
    await expectNoSidewaysPage(page);
  });

  test("the header's bigger controls still fit on a small phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await openBoard(page);
    const header = page.getByRole("banner");
    expect(await header.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
  });

  test("the Board's search, Label Filter and header controls are big enough to tap", async ({
    page,
  }) => {
    await openBoard(page);

    const search = page.getByRole("searchbox", { name: "Search Tasks" });
    await expectNoFocusZoom(search);
    await expectTouchSized(search);

    await expectTouchSized(
      page.getByRole("group", { name: "Filter by Label" }).getByRole("button").first(),
    );
    await expectTouchSized(page.getByRole("group", { name: "Theme" }).getByRole("button").first());
    await expectTouchSized(page.getByRole("button", { name: /^Demo controls/ }));
    await expectTouchSized(page.getByRole("button", { name: "New identity" }));
    // A small circle to look at, inside a bigger area to tap.
    const create = page.getByRole("link", { name: "Create a Task in To Do" });
    await expectTouchSized(create);
    expect((await size(create.locator("span"))).height).toBe(24);

    const card = page.getByRole("article", { name: "Fractional Rank for moves" });
    await expectTouchSized(card.getByRole("button", { name: /^Priority: / }));
    await expectTouchSized(card.getByRole("button", { name: "Move to…" }));
  });

  test("Create Task's fields don't zoom on focus and its controls are big enough to tap", async ({
    page,
  }) => {
    await page.goto("/tasks/new");
    const form = page.getByRole("main");

    for (const field of [
      form.getByRole("textbox", { name: /^Title/ }),
      form.getByRole("textbox", { name: "Description" }),
      form.getByRole("combobox", { name: "Status" }),
      form.getByRole("combobox", { name: "Priority" }),
      form.getByRole("combobox", { name: "Assignee" }),
    ]) {
      await expectNoFocusZoom(field);
      expect.soft((await size(field)).height, "field height").toBeGreaterThanOrEqual(MIN_TARGET);
    }
    await expectTouchSized(form.getByRole("button", { name: "Bug" }));
    await expectTouchSized(form.getByRole("button", { name: "Create Task" }));
  });

  test("Task detail's fields don't zoom on focus and its controls are big enough to tap", async ({
    page,
  }) => {
    await openBoard(page);
    const href = await page
      .getByRole("region", { name: "Board" })
      .getByRole("link", { name: "Fix the modal not closing on back" })
      .getAttribute("href");
    await page.goto(href!);
    const detail = page.getByRole("main");
    expect
      .soft((await size(detail.getByRole("link", { name: "Back to the Board" }))).height, "back link height")
      .toBeGreaterThanOrEqual(MIN_TARGET);

    for (const field of [
      detail.getByRole("combobox", { name: "Status" }),
      detail.getByRole("combobox", { name: "Assignee" }),
    ]) {
      await expectNoFocusZoom(field);
      await expectTouchSized(field);
    }
    await expectTouchSized(detail.getByRole("button", { name: /^Priority: / }));
    await expectTouchSized(detail.getByRole("button", { name: "Bug" }));

    const comment = detail.getByRole("textbox", { name: "Add a Comment" });
    await expectNoFocusZoom(comment);
    await expectTouchSized(detail.getByRole("button", { name: "Comment", exact: true }));
  });

  test("a sideways scroll of the Board settles with a column at its left edge", async ({
    page,
  }) => {
    await openBoard(page);
    const board = page.getByRole("region", { name: "Board" });

    // Past halfway to In Progress, so the nearest column edge is In Progress's.
    await board.evaluate((element) => element.scrollBy({ left: 200 }));

    await expect.poll(() => columnOffset(board, "In Progress")).toBe(BOARD_GUTTER);
  });
});

/** The Board's side padding on a phone, where a snapped column lines up. */
const BOARD_GUTTER = 16;

/** How far a column's left edge is from the Board's. */
async function columnOffset(board: Locator, status: string) {
  const [boardBox, columnBox] = await Promise.all([
    size(board),
    size(board.getByRole("region", { name: status })),
  ]);
  return Math.round(columnBox.x - boardBox.x);
}

test("on a desktop, a sideways scroll of the Board stays where it's left", async ({ page }) => {
  // Narrow enough that the Board scrolls.
  await page.setViewportSize({ width: 800, height: 800 });
  await openBoard(page);
  const board = page.getByRole("region", { name: "Board" });

  await board.evaluate((element) => element.scrollBy({ left: 200 }));

  await expect.poll(() => board.evaluate((element) => element.scrollLeft)).toBe(200);
});

test("on a desktop, the Board's controls keep their compact sizes", async ({ page }) => {
  await openBoard(page);

  const search = page.getByRole("searchbox", { name: "Search Tasks" });
  expect(await fontSize(search)).toBe(14);
  expect((await size(search)).height).toBe(32);
  expect((await size(page.getByRole("link", { name: "Create a Task in To Do" }))).height).toBe(24);
  // Mouse users drag cards instead.
  await expect(page.getByRole("button", { name: "Move to…" })).toHaveCount(0);
});

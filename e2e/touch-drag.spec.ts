import { expect, test, type Locator, type Page } from "@playwright/test";

// Runs on a phone (see playwright.config.ts). Moves rearrange the shared
// seeded Board, so these tests run one at a time, after the specs that read
// it, and each puts its card back where it found it.
test.describe.configure({ mode: "serial" });

/** Longer than the press a drag waits for, as a finger held still would be. */
const LONG_PRESS_MS = 400;

type Point = { x: number; y: number };

async function openBoard(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("group", { name: /^You are / })).toBeVisible();
}

function board(page: Page) {
  return page.getByRole("region", { name: "Board" });
}

function column(page: Page, status: string) {
  return board(page).getByRole("region", { name: status });
}

function card(page: Page, title: string) {
  return board(page).getByRole("article", { name: title });
}

/** The card that follows the finger while dragging. */
function overlay(page: Page) {
  return page.locator("article[aria-hidden]");
}

/** A column's card titles, top to bottom. */
async function titles(page: Page, status: string) {
  return column(page, status)
    .getByRole("article")
    .evaluateAll((cards) => cards.map((card) => card.getAttribute("aria-label")));
}

async function settled(moved: Locator) {
  await expect(moved).not.toHaveAttribute("data-pending");
}

/** A point on a card's body, clear of its title link and buttons. */
async function bodyOf(target: Locator): Promise<Point> {
  const box = (await target.boundingBox())!;
  return { x: box.x + 12, y: box.y + box.height - 6 };
}

/** A point over one half of a card. */
async function halfOf(target: Locator, half: "top" | "bottom"): Promise<Point> {
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height * (half === "top" ? 0.25 : 0.75) };
}

/**
 * One finger on the screen, as real touch events. Playwright can tap but not
 * drag a finger, so this goes through the Chrome DevTools Protocol.
 */
async function finger(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  let at: Point = { x: 0, y: 0 };
  const send = (type: "touchStart" | "touchMove" | "touchEnd", point?: Point) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: point ? [point] : [] });
  return {
    async down(point: Point) {
      at = point;
      await send("touchStart", point);
    },
    async move(to: Point, steps = 10) {
      const from = at;
      for (let step = 1; step <= steps; step++) {
        at = {
          x: from.x + ((to.x - from.x) * step) / steps,
          y: from.y + ((to.y - from.y) * step) / steps,
        };
        await send("touchMove", at);
      }
    },
    async up() {
      await send("touchEnd");
    },
  };
}

/** Long-presses `source`, then drags the finger to `to`, without lifting it. */
async function longPressDrag(page: Page, source: Locator, to: () => Promise<Point>) {
  const touch = await finger(page);
  await touch.down(await bodyOf(source));
  await page.waitForTimeout(LONG_PRESS_MS);
  await expect(overlay(page)).toBeVisible();
  await touch.move(await to());
  return touch;
}

/** How far the Board has scrolled sideways, and how far it can. */
function boardScroll(page: Page) {
  return board(page).evaluate((element) => ({
    left: Math.round(element.scrollLeft),
    max: element.scrollWidth - element.clientWidth,
  }));
}

/** How far in from the screen's right edge a finger holds a card to scroll the Board. */
const EDGE_INSET = 8;

/** Long-presses a card and holds it at the screen's right edge, level with where it was. */
async function holdAtRightEdge(page: Page, moving: Locator) {
  const { width } = page.viewportSize()!;
  const { y } = await bodyOf(moving);
  const touch = await longPressDrag(page, moving, async () => ({ x: width - EDGE_INSET, y }));
  return { touch, y };
}

/** Puts a card back at the top of To Do, where these tests take it from. */
async function putBackOnTop(page: Page, title: string) {
  const moving = card(page, title);
  await moving.getByRole("button", { name: "Move to…" }).tap();
  await page.getByRole("menuitem", { name: "To Do" }).tap();
  await expect.poll(async () => (await titles(page, "To Do"))[0]).toBe(title);
  await settled(moving);
}

/** The Board's side padding on a phone, where a snapped column lines up. */
const BOARD_GUTTER = 16;

/** How far a column's left edge is from the Board's. */
async function columnOffset(page: Page, status: string) {
  const [boardBox, columnBox] = await Promise.all([
    board(page).boundingBox(),
    column(page, status).boundingBox(),
  ]);
  return Math.round(columnBox!.x - boardBox!.x);
}

test("a card held at the screen's edge scrolls the Board along, drops into the column it reaches, and stays after a reload", async ({
  page,
}) => {
  await openBoard(page);
  const title = "Command palette with ⌘K";
  const moving = card(page, title);

  const { touch } = await holdAtRightEdge(page, moving);
  // Held still at the edge, the Board keeps scrolling, with no snapping
  // back to a column, until it can't go further.
  await expect
    .poll(async () => {
      const { left, max } = await boardScroll(page);
      return left >= max - 1;
    })
    .toBe(true);
  await touch.up();

  await expect(column(page, "Done").getByRole("article", { name: title })).toHaveCount(1);
  await settled(moving);
  await page.reload();
  await expect(column(page, "Done").getByRole("article", { name: title })).toHaveCount(1);

  // Snap is back once the drag is over.
  await board(page).evaluate((element) => element.scrollTo({ left: 200 }));
  await expect.poll(() => columnOffset(page, "In Progress")).toBe(BOARD_GUTTER);

  await putBackOnTop(page, title);
});

test("the Board scrolls along gradually, so a card can be dropped in the next column over", async ({
  page,
}) => {
  await openBoard(page);
  const title = "Command palette with ⌘K";
  const moving = card(page, title);

  const { touch, y } = await holdAtRightEdge(page, moving);
  // Snapping would jump it whole columns at a time; it creeps instead.
  // Checked every frame, so the finger leaves just past To Do.
  await board(page).evaluate(
    (element) =>
      new Promise<void>((resolve) => {
        const check = () =>
          element.scrollLeft >= 150 ? resolve() : requestAnimationFrame(check);
        check();
      }),
  );
  await touch.move({ x: page.viewportSize()!.width / 2, y }, 2);
  const stopped = (await boardScroll(page)).left;
  await page.waitForTimeout(200);
  expect((await boardScroll(page)).left, "stops once the finger leaves the edge").toBe(stopped);
  await touch.up();

  await expect(column(page, "In Progress").getByRole("article", { name: title })).toHaveCount(1);
  await settled(moving);

  await putBackOnTop(page, title);
});

test("held at the edge, the Board scrolls slowly enough to stop on a column", async ({
  page,
}) => {
  await openBoard(page);
  const title = "Command palette with ⌘K";
  const { width } = (await column(page, "In Progress").boundingBox())!;

  const { touch } = await holdAtRightEdge(page, card(page, title));
  // From the first scroll to one whole column (and its gap) gone by.
  const columnMs = await board(page).evaluate(
    (element, column) =>
      new Promise<number>((resolve) => {
        let start: number | null = null;
        const check = (now: number) => {
          if (start === null && element.scrollLeft > 0) start = now;
          if (start !== null && element.scrollLeft >= column) return resolve(now - start);
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
    width + 12,
  );
  await touch.up();

  // About half a second a column at full speed: time to let go of the edge.
  expect(columnMs).toBeGreaterThanOrEqual(350);
  await putBackOnTop(page, title);
});

test("a quick swipe across a card scrolls the Board and lifts nothing", async ({ page }) => {
  await openBoard(page);
  const before = await titles(page, "To Do");
  const start = await bodyOf(card(page, "Light, Dark and System themes"));

  const touch = await finger(page);
  await touch.down(start);
  await touch.move({ x: start.x - 200, y: start.y });
  await expect(overlay(page)).toHaveCount(0);
  await touch.up();

  await expect.poll(async () => (await boardScroll(page)).left).toBeGreaterThan(0);
  await expect(overlay(page)).toHaveCount(0);
  expect(await titles(page, "To Do")).toEqual(before);
});

test("a tap on a card's title still opens its Task", async ({ page }) => {
  await openBoard(page);
  await card(page, "Light, Dark and System themes").getByRole("link").tap();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/tasks\//);
});

test("a long-pressed card drags to a new place in its column, with the drop line, and stays after a reload", async ({
  page,
}) => {
  await openBoard(page);
  const moving = card(page, "Light, Dark and System themes");
  const target = card(page, "Command palette with ⌘K");

  const touch = await longPressDrag(page, moving, () => halfOf(target, "top"));
  await expect(target.locator("[data-drop-line]")).toHaveAttribute("data-drop-line", "top");
  await touch.up();

  const expected = [
    "Light, Dark and System themes",
    "Command palette with ⌘K",
    "Edge-drag between columns on mobile",
    "Write the README and architecture overview",
  ];
  await expect.poll(() => titles(page, "To Do")).toEqual(expected);
  await expect(overlay(page)).toHaveCount(0);
  await settled(moving);
  await page.reload();
  await expect.poll(() => titles(page, "To Do")).toEqual(expected);

  // Put it back.
  const back = await longPressDrag(page, moving, () =>
    halfOf(card(page, "Edge-drag between columns on mobile"), "bottom"),
  );
  await back.up();
  await expect
    .poll(() => titles(page, "To Do"))
    .toEqual([
      "Command palette with ⌘K",
      "Edge-drag between columns on mobile",
      "Light, Dark and System themes",
      "Write the README and architecture overview",
    ]);
  await settled(moving);
});

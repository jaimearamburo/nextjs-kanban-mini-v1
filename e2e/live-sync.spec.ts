import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

// Live sync between two Guests, each in its own browser context (ADR-0005).
// Every write here reaches every open page, so this spec runs on its own,
// after the others (see playwright.config.ts), one test at a time.
test.describe.configure({ mode: "serial" });

const CYCLE = ["None", "Low", "Medium", "High", "Urgent"];

/** Well inside "about 2 seconds" from edit to update. */
const LIVE = { timeout: 2_500 };

async function openBoard(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("group", { name: /^You are / })).toBeVisible();
}

/** Opens the Board and waits until live sync is connected, so no event is missed. */
async function openConnected(page: Page) {
  const token = page.waitForResponse(
    (response) => response.url().endsWith("/api/realtime/token") && response.ok(),
  );
  await openBoard(page);
  await token;
  // The token comes just before the channel attaches.
  await page.waitForTimeout(1_000);
}

/** Two Guests, A and B, each in their own browser, both on the Board. */
async function twoGuests(browser: Browser) {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const [a, b] = await Promise.all(contexts.map((context) => context.newPage()));
  await Promise.all([a, b].map(openConnected));
  return { a, b, close: () => Promise.all(contexts.map((context) => context.close())) };
}

/** Counts soft refreshes: the RSC requests router.refresh() makes, not prefetches. */
function countRefreshes(page: Page) {
  const counter = { count: 0 };
  page.on("request", (request) => {
    const headers = request.headers();
    if (
      request.method() === "GET" &&
      headers["rsc"] === "1" &&
      !headers["next-router-prefetch"] &&
      !headers["next-router-segment-prefetch"]
    ) {
      counter.count++;
    }
  });
  return counter;
}

function board(page: Page) {
  return page.getByRole("region", { name: "Board" });
}

function card(page: Page, title: string) {
  return board(page).getByRole("article", { name: title });
}

function column(page: Page, status: string) {
  return board(page).getByRole("region", { name: status });
}

/** A column's card titles, top to bottom. */
async function titles(page: Page, status: string) {
  return column(page, status)
    .getByRole("article")
    .evaluateAll((cards) => cards.map((card) => card.getAttribute("aria-label")));
}

function priorityButton(card: Locator) {
  return card.getByRole("button", { name: /^Priority: / });
}

async function shownPriority(card: Locator) {
  return (await priorityButton(card).getAttribute("aria-label"))!.replace("Priority: ", "");
}

function next(priority: string) {
  return CYCLE[(CYCLE.indexOf(priority) + 1) % CYCLE.length];
}

/** Clicks a card's Priority once and waits until the server has it. */
async function cyclePriority(card: Locator) {
  const before = await shownPriority(card);
  await priorityButton(card).click();
  await expect(priorityButton(card)).toHaveAccessibleName(`Priority: ${next(before)}`);
  await expect(priorityButton(card)).not.toHaveAttribute("data-pending");
  return next(before);
}

/** Presses the mouse on `source` and drags until it's over one half of `target`, without dropping. */
async function pickUpOver(page: Page, source: Locator, target: Locator, half: "top" | "bottom") {
  const from = (await source.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 2 });
  const to = (await target.boundingBox())!;
  await page.mouse.move(to.x + to.width / 2, to.y + to.height * (half === "top" ? 0.25 : 0.75), {
    steps: 10,
  });
}

/** Drags `title` to the top of `status` and waits until the move has saved. */
async function moveToTop(page: Page, title: string, status: string) {
  const top = (await titles(page, status))[0]!;
  await pickUpOver(page, card(page, title), card(page, top), "top");
  await page.mouse.up();
  await expect.poll(async () => (await titles(page, status))[0]).toBe(title);
  await expect(card(page, title)).not.toHaveAttribute("data-pending");
}

test("an edit in one browser appears live in another, keeping its open Task and page state, and not refreshing the editor", async ({
  browser,
}) => {
  const { a, b, close } = await twoGuests(browser);
  try {
    const title = "Board skeleton while data streams in";
    // B has a Task open over the Board, and page state a reload would lose.
    await card(b, title).getByRole("link", { name: title }).click();
    const modal = b.getByRole("dialog");
    await expect(modal.getByRole("heading", { name: title })).toBeVisible();
    await b.evaluate(() => Object.assign(window, { __notReloaded: true }));
    const aRefreshes = countRefreshes(a);
    const bRefreshes = countRefreshes(b);

    const priority = await cyclePriority(card(a, title));

    // B: the open Task detail updates in place, with no reload.
    await expect(modal.locator("dt:text-is('Priority') + dd")).toHaveText(priority, LIVE);
    await expect(modal.getByRole("heading", { name: title })).toBeVisible();
    expect(await b.evaluate(() => "__notReloaded" in window)).toBe(true);
    expect(bRefreshes.count).toBeGreaterThan(0);
    // And so did the card behind it.
    await b.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
    await expect(priorityButton(card(b, title))).toHaveAccessibleName(`Priority: ${priority}`);
    // A already shows its own change, so its event refreshes nothing.
    await a.waitForTimeout(1_500);
    expect(aRefreshes.count).toBe(0);
  } finally {
    await close();
  }
});

test("a browser mid-drag holds refreshes back, then catches up when the card is dropped", async ({
  browser,
}) => {
  const { a, b, close } = await twoGuests(browser);
  try {
    const edited = "Error boundary with retry";
    const dragged = "Keep production out of reach of dev and tests";
    const before = await shownPriority(card(b, edited));
    await pickUpOver(b, card(b, dragged), card(b, dragged), "bottom");

    const priority = await cyclePriority(card(a, edited));

    // Long past when B would have refreshed, it still shows the old Priority.
    await b.waitForTimeout(2_500);
    await expect(priorityButton(card(b, edited))).toHaveAccessibleName(`Priority: ${before}`);
    // Cancelled: no move, but the held refresh runs.
    await b.keyboard.press("Escape");
    await b.mouse.up();
    await expect(priorityButton(card(b, edited))).toHaveAccessibleName(`Priority: ${priority}`, LIVE);
  } finally {
    await close();
  }
});

test("a drop refused because another Guest moved its neighbour explains why, then shows the Board as it is", async ({
  browser,
}) => {
  const { a, b, close } = await twoGuests(browser);
  const neighbour = "Fix the modal not closing on back";
  const dragged = "Edge-drag between columns on mobile";
  try {
    const inReview = await titles(b, "In Review");
    expect(inReview[0]).toBe(neighbour);
    // B aims between the first two cards of In Review.
    await pickUpOver(b, card(b, dragged), card(b, inReview[1]!), "top");

    // Meanwhile A moves the card above that gap to Done.
    await moveToTop(a, neighbour, "Done");

    await b.mouse.up();

    await expect(b.getByText("Couldn't move the Task")).toBeVisible();
    await expect(b.getByText("The Board changed while you were dragging. Try again.")).toBeVisible();
    await expect(column(b, "Done").getByRole("article", { name: neighbour })).toBeVisible(LIVE);
    await expect(column(b, "In Review").getByRole("article", { name: dragged })).toHaveCount(0);
  } finally {
    // Put the neighbour back at the top of In Review.
    if ((await titles(a, "In Review"))[0] !== neighbour) {
      await moveToTop(a, neighbour, "In Review");
    }
    await close();
  }
});

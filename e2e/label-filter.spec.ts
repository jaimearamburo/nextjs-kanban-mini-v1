import { expect, test, type Page } from "@playwright/test";

// Runs against a production build on the freshly seeded `test` database.
// These tests only read Titles and Labels, which no other test changes.

const BUG_OR_DOCS = [
  "Write the README and architecture overview",
  "Fix the modal not closing on back",
  "Keep production out of reach of dev and tests",
  "Error boundary with retry",
];
const MODAL_BUG = "Fix the modal not closing on back";

/** Opens a Board URL and waits until it has hydrated, so clicks aren't lost. */
async function openBoard(page: Page, url = "/") {
  await page.goto(url);
  await expect(page.getByRole("group", { name: /^You are / })).toBeVisible();
}

function board(page: Page) {
  return page.getByRole("region", { name: "Board" });
}

function pill(page: Page, name: string) {
  return page.getByRole("group", { name: "Filter by Label" }).getByRole("button", { name });
}

function search(page: Page) {
  return page.getByRole("searchbox", { name: "Search Tasks" });
}

/** Asserts the Board shows exactly these cards, by title, in Board order. */
async function expectCards(page: Page, titles: string[]) {
  await expect
    .poll(() =>
      board(page)
        .getByRole("article")
        .evaluateAll((cards) => cards.map((card) => card.getAttribute("aria-label"))),
    )
    .toEqual(titles);
}

test("selecting several Labels shows Tasks with any of them, and the URL reproduces the view", async ({
  page,
  browser,
}) => {
  await openBoard(page);

  await pill(page, "Bug").click();
  await pill(page, "Docs").click();

  await expect(page).toHaveURL(/\/\?labels=bug,docs$/);
  await expectCards(page, BUG_OR_DOCS);

  // The URL alone, in a fresh browser, reproduces the filtered view.
  const other = await browser.newContext();
  try {
    const otherPage = await other.newPage();
    await openBoard(otherPage, page.url());
    await expect(pill(otherPage, "Bug")).toHaveAttribute("aria-pressed", "true");
    await expect(pill(otherPage, "Docs")).toHaveAttribute("aria-pressed", "true");
    await expect(pill(otherPage, "Frontend")).toHaveAttribute("aria-pressed", "false");
    await expectCards(otherPage, BUG_OR_DOCS);
  } finally {
    await other.close();
  }
});

test("back and forward step through Label changes", async ({ page }) => {
  await openBoard(page);

  await pill(page, "Bug").click();
  await expect(page).toHaveURL(/\/\?labels=bug$/);
  await pill(page, "Docs").click();
  await expect(page).toHaveURL(/\/\?labels=bug,docs$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/\?labels=bug$/);
  await expect(pill(page, "Docs")).toHaveAttribute("aria-pressed", "false");
  await expectCards(page, [MODAL_BUG, "Error boundary with retry"]);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(board(page).getByRole("article")).toHaveCount(16);

  await page.goForward();
  await page.goForward();
  await expect(page).toHaveURL(/\/\?labels=bug,docs$/);
  await expectCards(page, BUG_OR_DOCS);
});

test("search combines with the Label Filter, and typing adds no history entries", async ({
  page,
}) => {
  await openBoard(page, "/?labels=bug,docs");
  const entries = await page.evaluate(() => history.length);

  await search(page).fill("modal");

  await expect(page).toHaveURL(/\/\?labels=bug,docs&q=modal$/);
  await expectCards(page, [MODAL_BUG]);
  await search(page).pressSequentially(" not", { delay: 50 });
  await expect(page).toHaveURL(/\/\?labels=bug,docs&q=modal\+not$/);
  await expectCards(page, [MODAL_BUG]);
  expect(await page.evaluate(() => history.length)).toBe(entries);

  // Back leaves the Board, rather than undoing keystrokes.
  await page.goBack();
  await expect(page).toHaveURL("about:blank");

  // Coming forward again loads the Board with the search in the input.
  await page.goForward();
  await expect(search(page)).toHaveValue("modal not");
  await expectCards(page, [MODAL_BUG]);
});

test("the clicked pill highlights at once and the Board dims while the filter loads", async ({
  page,
}) => {
  await openBoard(page);
  // Hold the Board's server render until released.
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(
    (url) => url.searchParams.get("labels") === "bug",
    async (route) => {
      await held;
      await route.continue();
    },
  );

  await pill(page, "Bug").click();

  await expect(pill(page, "Bug")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "Filter by Label" })).toHaveAttribute(
    "data-pending",
  );
  await expect(board(page)).toHaveCSS("opacity", "0.5");
  await expect(board(page).getByRole("article")).toHaveCount(16);

  release();

  await expectCards(page, [MODAL_BUG, "Error boundary with retry"]);
  await expect(page.getByRole("group", { name: "Filter by Label" })).not.toHaveAttribute(
    "data-pending",
  );
  await expect(board(page)).toHaveCSS("opacity", "1");
});

for (const [first, then] of [
  ["a Label change", "typing"],
  ["a search", "a Label change"],
] as const) {
  test(`${then} while ${first} is loading keeps both`, async ({ page }) => {
    await openBoard(page);
    const steps = {
      "a Label change": () => pill(page, "Bug").click(),
      typing: () => search(page).fill("modal"),
      "a search": () => search(page).fill("modal"),
    };
    // Hold the first change's server render until the second has been made.
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(
      (url) =>
        first === "a Label change"
          ? url.searchParams.get("labels") === "bug" && !url.searchParams.has("q")
          : url.searchParams.get("q") === "modal" && !url.searchParams.has("labels"),
      async (route) => {
        await held;
        await route.continue();
      },
    );

    await steps[first]();
    await steps[then]();
    release();

    await expect(page).toHaveURL(/\/\?(labels=bug&q=modal|q=modal&labels=bug)$/);
    await expect(pill(page, "Bug")).toHaveAttribute("aria-pressed", "true");
    await expect(search(page)).toHaveValue("modal");
    await expectCards(page, [MODAL_BUG]);
  });
}

test("invalid search params are ignored", async ({ page }) => {
  await openBoard(page, "/?labels=nope,%27%3B,docs&q=");

  await expect(pill(page, "Docs")).toHaveAttribute("aria-pressed", "true");
  await expectCards(page, [
    "Write the README and architecture overview",
    "Keep production out of reach of dev and tests",
  ]);
});

for (const [how, close] of [
  ["Esc", (page: Page) => page.keyboard.press("Escape")],
  // The Board's uncovered left quarter, below the header.
  ["the backdrop", (page: Page) => page.mouse.click(100, 400)],
  ["the back button", (page: Page) => page.goBack()],
] as const) {
  test(`closing a Task with ${how} returns to the Board with the filter and search kept`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openBoard(page, "/?labels=bug&q=modal");
    await expectCards(page, [MODAL_BUG]);

    await board(page).getByRole("link", { name: MODAL_BUG }).click();
    await expect(page.getByRole("dialog", { name: MODAL_BUG })).toBeVisible();
    // The filter stays shown behind the open Task.
    await expect(
      page.getByRole("button", { name: "Bug", pressed: true, includeHidden: true }),
    ).toHaveCount(1);
    await close(page);

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/\?labels=bug&q=modal$/);
    await expect(pill(page, "Bug")).toHaveAttribute("aria-pressed", "true");
    await expect(search(page)).toHaveValue("modal");
    await expectCards(page, [MODAL_BUG]);
  });
}

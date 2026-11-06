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
  ["the backdrop", (page: Page) => page.mouse.click(5, 300)],
  ["the back button", (page: Page) => page.goBack()],
] as const) {
  test(`closing with ${how} returns to the Board with its scroll position kept`, async ({
    page,
  }) => {
    // Narrow enough that the Board scrolls horizontally to reach Done.
    await page.setViewportSize({ width: 375, height: 800 });
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

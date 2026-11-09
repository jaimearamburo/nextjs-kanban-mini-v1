import { expect, test, type Locator, type Page } from "@playwright/test";
import { setDemoControls } from "./demo-controls";

// Moves rearrange the shared seeded Board, so these tests run one at a time,
// after the specs that read it (see playwright.config.ts), and each puts its
// card back where it found it.
test.describe.configure({ mode: "serial" });

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

/** A column's card titles, top to bottom. */
async function titles(page: Page, status: string) {
  return column(page, status)
    .getByRole("article")
    .evaluateAll((cards) => cards.map((card) => card.getAttribute("aria-label")));
}

/** Presses the mouse on `source` and drags until the pointer is over one half of `target`. */
async function dragOver(page: Page, source: Locator, target: Locator, half: "top" | "bottom") {
  const from = (await source.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // Past the activation distance, so it's a drag rather than a click.
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 2 });
  const to = (await target.boundingBox())!;
  await page.mouse.move(
    to.x + to.width / 2,
    to.y + to.height * (half === "top" ? 0.25 : 0.75),
    { steps: 10 },
  );
}

/** Drags `source` onto one half of `target` and drops it there. */
async function drag(page: Page, source: Locator, target: Locator, half: "top" | "bottom") {
  await dragOver(page, source, target, half);
  await page.mouse.up();
}

/** Waits until a moved card's move has been confirmed or rolled back. */
async function settled(moved: Locator) {
  await expect(moved).not.toHaveAttribute("data-pending");
}

function dropLine(target: Locator) {
  return target.locator("[data-drop-line]");
}

test("a card dropped between two cards in another Status lands exactly there, and stays after a reload", async ({
  page,
}) => {
  await openBoard(page);
  const moving = card(page, "Edge-drag between columns on mobile");

  await dragOver(page, moving, card(page, "Label Filter in the URL"), "top");

  // The line is drawn above the card the pointer is over; nothing shifts.
  await expect(dropLine(card(page, "Label Filter in the URL"))).toHaveAttribute(
    "data-drop-line",
    "top",
  );
  await expect(page.locator("[data-drop-line]")).toHaveCount(1);
  await page.mouse.up();

  const expected = [
    "Fix the modal not closing on back",
    "Edge-drag between columns on mobile",
    "Label Filter in the URL",
    "Archive Comments instead of deleting them",
  ];
  expect(await titles(page, "In Review")).toEqual(expected);
  await expect(page.locator("[data-drop-line]")).toHaveCount(0);
  await settled(moving);
  await page.reload();
  await expect.poll(() => titles(page, "In Review")).toEqual(expected);
  await expect(column(page, "To Do").getByRole("article", { name: "Edge-drag between columns on mobile" })).toHaveCount(0);

  // Put it back.
  await drag(page, moving, card(page, "Light, Dark and System themes"), "top");
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

test("a card reorders within its Status, down to the bottom", async ({ page }) => {
  await openBoard(page);
  const moving = card(page, "Fix the modal not closing on back");

  await dragOver(page, moving, card(page, "Archive Comments instead of deleting them"), "bottom");
  await expect(
    dropLine(card(page, "Archive Comments instead of deleting them")),
  ).toHaveAttribute("data-drop-line", "bottom");
  await page.mouse.up();

  const expected = [
    "Label Filter in the URL",
    "Archive Comments instead of deleting them",
    "Fix the modal not closing on back",
  ];
  expect(await titles(page, "In Review")).toEqual(expected);
  await settled(moving);
  await page.reload();
  await expect.poll(() => titles(page, "In Review")).toEqual(expected);

  await drag(page, moving, card(page, "Label Filter in the URL"), "top");
  await expect.poll(() => titles(page, "In Review")).toEqual([
    "Fix the modal not closing on back",
    "Label Filter in the URL",
    "Archive Comments instead of deleting them",
  ]);
  await settled(moving);
});

test("a card dropped on the top half of a column's first card goes to the top, with nothing faded", async ({
  page,
  context,
}) => {
  await openBoard(page);
  // Latency keeps the move pending long enough to check nothing fades.
  await setDemoControls(page, context, { latency: "1s", failure: "Off" });
  const moving = card(page, "Write the README and architecture overview");

  await drag(page, moving, card(page, "Walking skeleton deployed to Vercel"), "top");

  // Shown at once, while the server is still working.
  expect((await titles(page, "Done"))[0]).toBe("Write the README and architecture overview");
  const opacity = await page
    .getByRole("region", { name: "Board" })
    .evaluate((el) => getComputedStyle(el).opacity);
  await expect(moving).toHaveAttribute("data-pending");
  expect(opacity).toBe("1");
  await settled(moving);
  await page.reload();
  await expect.poll(async () => (await titles(page, "Done"))[0]).toBe(
    "Write the README and architecture overview",
  );

  await drag(page, moving, card(page, "Light, Dark and System themes"), "bottom");
  await expect.poll(async () => (await titles(page, "To Do")).at(-1)).toBe(
    "Write the README and architecture overview",
  );
  await settled(moving);
});

test("with Always fail on, a dropped card snaps back with a toast", async ({ page, context }) => {
  await openBoard(page);
  await setDemoControls(page, context, { latency: "1s", failure: "Always" });
  const before = await titles(page, "In Progress");

  await drag(page, card(page, "Optimistic priority cycling"), card(page, "Command palette with ⌘K"), "top");

  // Optimistic first...
  expect((await titles(page, "To Do"))[0]).toBe("Optimistic priority cycling");
  // ...then rolled back, with an explanation.
  await expect(page.getByText("Couldn't move the Task")).toBeVisible();
  await expect(page.getByText("Simulated failure (demo controls).")).toBeVisible();
  await expect.poll(() => titles(page, "In Progress")).toEqual(before);
  await settled(card(page, "Optimistic priority cycling"));
  await page.reload();
  await expect.poll(() => titles(page, "In Progress")).toEqual(before);
});

test("the dragged card lifts off on the first pixel of movement, and a plain click lifts nothing", async ({
  page,
}) => {
  await openBoard(page);
  const source = card(page, "Prisma schema and seed data");
  const overlay = page.locator("article[aria-hidden]");
  const box = (await source.boundingBox())!;
  // The card body, clear of the title link and the Priority button.
  const body = { x: box.x + 12, y: box.y + box.height - 6 };

  await page.mouse.move(body.x, body.y);
  await page.mouse.down();
  await page.mouse.up();
  await expect(overlay).toHaveCount(0);
  await expect(source).toHaveCSS("opacity", "1");

  await page.mouse.down();
  await page.mouse.move(body.x + 1, body.y);
  await expect(overlay).toBeVisible();
  await expect(source).toHaveCSS("opacity", "0.4");
  // Over its own place, so letting go changes nothing.
  await page.mouse.up();
  await expect(overlay).toHaveCount(0);
  await expect(source).not.toHaveAttribute("data-pending");
});

import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { setDemoControls } from "./demo-controls";

const TITLE = "Prisma schema and seed data";

async function openBoard(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("group", { name: /^You are / })).toBeVisible();
  return page;
}

async function openDetail(page: Page, title = TITLE) {
  await page
    .getByRole("region", { name: "Board", includeHidden: true })
    .getByRole("article", { name: title, includeHidden: true })
    .getByRole("link", { name: title, includeHidden: true })
    .click();
  const modal = page.getByRole("dialog", { name: title });
  await expect(modal.getByRole("textbox", { name: "Add a Comment" })).toBeVisible();
  return modal;
}

/** The open modal makes the header inert, so demo controls change with it closed. */
async function reopenWith(
  page: Page,
  context: BrowserContext,
  settings: { latency: string; failure: string },
) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await setDemoControls(page, context, settings);
  await openDetail(page);
}

function comment(detail: Locator, body: string) {
  return detail.getByRole("listitem").filter({ hasText: body });
}

async function add(detail: Locator, body: string) {
  const input = detail.getByRole("textbox", { name: "Add a Comment" });
  await input.fill(body);
  await detail.getByRole("button", { name: "Comment", exact: true }).click();
  return input;
}

/** May run more than once on a reused server, so every Comment has a unique body. */
function unique(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

test("an added Comment shows pending at once, then confirmed, and the input clears", async ({
  page,
  context,
}) => {
  await openBoard(page);
  await setDemoControls(page, context, { latency: "1s", failure: "Off" });
  const detail = await openDetail(page);
  const body = unique("Pending");

  const input = await add(detail, body);

  await expect(input).toHaveValue("");
  await expect(comment(detail, body)).toHaveAttribute("data-pending");
  const pendingBox = await comment(detail, body).boundingBox();
  await expect(comment(detail, body)).not.toHaveAttribute("data-pending", { timeout: 10_000 });
  await expect(comment(detail, body)).toBeVisible();
  await expect(comment(detail, body).getByRole("button", { name: "Delete Comment" })).toBeVisible();
  // The Delete button arriving must not move the row's text.
  expect((await comment(detail, body).boundingBox())?.height).toBe(pendingBox?.height);
});

test("deleting a Comment fades it out and it stays gone after a reload", async ({ page, context }) => {
  await openBoard(page);
  const detail = await openDetail(page);
  const body = unique("Delete me");
  await add(detail, body);
  const deleteButton = comment(detail, body).getByRole("button", { name: "Delete Comment" });
  await expect(deleteButton).toBeVisible();

  await reopenWith(page, context, { latency: "1s", failure: "Off" });
  await deleteButton.click();

  await expect(deleteButton).toHaveAttribute("data-pending");
  await expect(comment(detail, body)).toHaveCSS("opacity", "0");
  await expect(comment(detail, body)).toHaveCount(0, { timeout: 10_000 });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Add a Comment" })).toBeVisible();
  await expect(page.getByText(body)).toHaveCount(0);
});

test("with Always fail on, an add and a delete each roll back with a toast", async ({
  page,
  context,
}) => {
  await openBoard(page);
  const detail = await openDetail(page);
  const kept = unique("Kept");
  await add(detail, kept);
  await expect(comment(detail, kept).getByRole("button", { name: "Delete Comment" })).toBeVisible();

  await reopenWith(page, context, { latency: "Off", failure: "Always" });

  const rejected = unique("Rejected");
  const input = await add(detail, rejected);
  await expect(page.getByText("Couldn't add the Comment")).toBeVisible();
  await expect(comment(detail, rejected)).toHaveCount(0);
  await expect(input).toHaveValue(rejected);

  await comment(detail, kept).getByRole("button", { name: "Delete Comment" }).click();
  await expect(page.getByText("Couldn't delete the Comment")).toBeVisible();
  await expect(comment(detail, kept)).toHaveCSS("opacity", "1");
  await expect(
    comment(detail, kept).getByRole("button", { name: "Delete Comment" }),
  ).not.toHaveAttribute("data-pending");
});

test("the empty state gives way to the first pending Comment", async ({ page, context }) => {
  await openBoard(page);
  await setDemoControls(page, context, { latency: "1s", failure: "Off" });
  const detail = await openDetail(page, "Board skeleton while data streams in");
  const body = unique("First");
  await expect(detail.getByText("No Comments yet.")).toBeVisible();

  await add(detail, body);

  await expect(comment(detail, body)).toHaveAttribute("data-pending");
  await expect(detail.getByText("No Comments yet.")).toBeHidden();

  // Leaves the Task empty for the next run on a reused server.
  const deleteButton = comment(detail, body).getByRole("button", { name: "Delete Comment" });
  await deleteButton.click({ timeout: 10_000 });
  await expect(detail.getByText("No Comments yet.")).toBeVisible({ timeout: 10_000 });
});

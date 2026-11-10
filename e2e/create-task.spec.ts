import { expect, test, type Locator, type Page } from "@playwright/test";
import { setDemoControls } from "./demo-controls";

// Runs after every other spec, since it adds Tasks to the Board they count.
// May run more than once on a reused server, so every Task has a unique title.

function unique(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function openBoard(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("group", { name: /^You are / })).toBeVisible();
}

/** A column. The open modal makes the Board inert, hence includeHidden. */
function column(page: Page, name: string) {
  return page
    .getByRole("region", { name: "Board", includeHidden: true })
    .getByRole("region", { name, includeHidden: true });
}

function firstCard(page: Page, columnName: string) {
  return column(page, columnName).getByRole("article", { includeHidden: true }).first();
}

/** Opens the form from the Create button above the Board, or a column's + button. */
async function openForm(page: Page, from: string = "board") {
  const opener =
    from === "board"
      ? page.getByRole("main").getByRole("link", { name: "Create a Task", exact: true })
      : column(page, from).getByRole("link", { name: `Create a Task in ${from}` });
  await opener.click();
  const form = page.getByRole("dialog", { name: "Create Task" });
  await expect(form.getByRole("textbox", { name: "Title" })).toBeVisible();
  await expect(page).toHaveURL(/\/tasks\/new/);
  return form;
}

function submit(form: Locator) {
  return form.getByRole("button", { name: /^(Create Task|Creating…)$/ });
}

test("the Create above the Board defaults to To Do; a title alone creates a Task at the top of To Do, pending first", async ({
  page,
  context,
}) => {
  await openBoard(page);
  await setDemoControls(page, context, { latency: "1s", failure: "Off" });
  const form = await openForm(page);
  const title = unique("Title only");
  await expect(form.getByRole("combobox", { name: "Status" })).toHaveValue("TODO");
  await expect(form.getByRole("combobox", { name: "Priority" })).toHaveValue("NONE");

  await form.getByRole("textbox", { name: "Title" }).fill(title);
  await submit(form).click();

  // Pending: the button says so and the card is already at the top of To Do.
  await expect(submit(form)).toHaveText("Creating…");
  await expect(submit(form)).toBeDisabled();
  // The pending card is inert, which hides its accessible name, so read its label.
  await expect(firstCard(page, "To Do")).toHaveAttribute("data-pending");
  await expect(firstCard(page, "To Do")).toHaveAttribute("aria-label", title);

  // Saved: the modal closes on the Board, and the card is a real one.
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 10_000 });
  await expect(page).toHaveURL(/\/$/);
  await expect(firstCard(page, "To Do")).toHaveAccessibleName(title);
  await expect(firstCard(page, "To Do")).not.toHaveAttribute("data-pending");
  await expect(
    firstCard(page, "To Do").getByRole("button", { name: "Priority: None" }),
  ).toBeVisible();

  await page.reload();
  await expect(firstCard(page, "To Do")).toHaveAccessibleName(title);
});

test("a column's + button preselects its Status, and every field is saved", async ({ page }) => {
  await openBoard(page);
  const form = await openForm(page, "In Review");
  const title = unique("Every field");
  await expect(form.getByRole("combobox", { name: "Status" })).toHaveValue("IN_REVIEW");

  await form.getByRole("textbox", { name: "Title" }).fill(title);
  await form.getByRole("textbox", { name: "Description" }).fill("First line\nSecond line");
  await form.getByRole("combobox", { name: "Priority" }).selectOption({ label: "High" });
  await form.getByRole("combobox", { name: "Assignee" }).selectOption({ label: "Maya Chen" });
  await form.getByRole("button", { name: "Docs" }).click();
  await expect(form.getByRole("button", { name: "Docs" })).toHaveAttribute("aria-pressed", "true");
  await submit(form).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  const card = firstCard(page, "In Review");
  await expect(card).toHaveAccessibleName(title);
  await expect(card.getByRole("button", { name: "Priority: High" })).toBeVisible();
  await expect(card.getByText("Docs")).toBeVisible();

  await card.getByRole("link", { name: title }).click();
  const detail = page.getByRole("dialog", { name: title });
  await expect(detail.getByText("Second line")).toBeVisible();
  await expect(
    detail.getByRole("combobox", { name: "Assignee" }).locator("option:checked"),
  ).toHaveText("Maya Chen");
});

test("a blank title is refused inline by the server, keeping what was typed", async ({ page }) => {
  await openBoard(page);
  const form = await openForm(page);

  await form.getByRole("textbox", { name: "Title" }).fill("   ");
  await form.getByRole("textbox", { name: "Description" }).fill("Kept after the refusal");
  await submit(form).click();

  await expect(form.getByText("Enter a title.")).toBeVisible();
  await expect(form.getByRole("textbox", { name: "Title" })).toHaveAttribute("aria-invalid", "true");
  await expect(form.getByRole("textbox", { name: "Title" })).toHaveAccessibleDescription(
    "Enter a title.",
  );
  await expect(form.getByRole("textbox", { name: "Description" })).toHaveValue(
    "Kept after the refusal",
  );
  await expect(submit(form)).toHaveText("Create Task");
  // The form stays open, and no card was shown for it.
  await expect(form).toBeVisible();
  await expect(column(page, "To Do").locator("[data-pending]")).toHaveCount(0);
});

test("after a refusal then a successful create, the form opens again empty with no errors", async ({
  page,
}) => {
  await openBoard(page);
  let form = await openForm(page);
  await submit(form).click();
  await expect(form.getByText("Enter a title.")).toBeVisible();

  await form.getByRole("textbox", { name: "Title" }).fill(unique("After a refusal"));
  await submit(form).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Next keeps the closed form mounted (hidden), so this is the same form, reset.
  form = await openForm(page);
  await expect(form.getByText("Enter a title.")).toHaveCount(0);
  await expect(form.getByRole("textbox", { name: "Title" })).toHaveValue("");
  await expect(form.getByRole("textbox", { name: "Title" })).not.toHaveAttribute("aria-invalid");
});

test("the character counter appears only near the title and description limits", async ({
  page,
}) => {
  await openBoard(page);
  const form = await openForm(page);
  const titleBox = form.getByRole("textbox", { name: "Title" });
  const descriptionBox = form.getByRole("textbox", { name: "Description" });

  await titleBox.fill("x".repeat(99));
  await expect(form.getByText(/\/120 characters/)).toHaveCount(0);
  await titleBox.fill("x".repeat(100));
  await expect(form.getByText("100/120 characters")).toBeVisible();
  // The box stops at the limit.
  await titleBox.fill("x".repeat(130));
  await expect(form.getByText("120/120 characters")).toBeVisible();

  await descriptionBox.fill("y".repeat(1799));
  await expect(form.getByText(/\/2,000 characters/)).toHaveCount(0);
  await descriptionBox.fill("y".repeat(1850));
  await expect(form.getByText("1,850/2,000 characters")).toBeVisible();
});

test("with Always fail on, the create is refused with a toast and nothing is added", async ({
  page,
  context,
}) => {
  await openBoard(page);
  await setDemoControls(page, context, { latency: "Off", failure: "Always" });
  const form = await openForm(page);
  const title = unique("Rejected");

  await form.getByRole("textbox", { name: "Title" }).fill(title);
  await submit(form).click();

  await expect(page.getByText("Couldn't create the Task")).toBeVisible();
  await expect(form.getByRole("textbox", { name: "Title" })).toHaveValue(title);
  await expect(column(page, "To Do").getByRole("article", { name: title, includeHidden: true })).toHaveCount(0);
});

test("loading /tasks/new directly shows the full page, which goes back to the Board once created", async ({
  page,
}) => {
  await page.goto("/tasks/new?status=IN_PROGRESS");

  await expect(page.getByRole("heading", { level: 1, name: "Create Task" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to the Board" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("IN_PROGRESS");

  const title = unique("From the full page");
  await page.getByRole("textbox", { name: "Title" }).fill(title);
  await page.getByRole("button", { name: "Create Task" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(firstCard(page, "In Progress")).toHaveAccessibleName(title);
});

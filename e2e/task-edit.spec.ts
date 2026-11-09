import { expect, test, type Locator, type Page } from "@playwright/test";
import { setDemoControls } from "./demo-controls";

// May run more than once on a reused server, so each test works from the
// values it finds rather than the seeded ones.

async function openBoard(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("group", { name: /^You are / })).toBeVisible();
}

function card(page: Page, title: string) {
  return page
    .getByRole("region", { name: "Board", includeHidden: true })
    .getByRole("article", { name: title, includeHidden: true });
}

async function openTask(page: Page, title: string) {
  await card(page, title).getByRole("link", { name: title, includeHidden: true }).click();
  const modal = page.getByRole("dialog", { name: title });
  await expect(modal).toBeVisible();
  return modal;
}

function statusSelect(detail: Locator) {
  return detail.getByRole("combobox", { name: "Status" });
}

function assigneeSelect(detail: Locator) {
  return detail.getByRole("combobox", { name: "Assignee" });
}

function priorityButton(scope: Locator) {
  return scope.getByRole("button", { name: /^Priority: /, includeHidden: true });
}

test("a Status change moves the card to the top of the target column", async ({ page }) => {
  const title = "Board skeleton while data streams in";
  await openBoard(page);
  const detail = await openTask(page, title);
  const target = (await statusSelect(detail).inputValue()) === "TODO" ? "IN_PROGRESS" : "TODO";
  const column = target === "TODO" ? "To Do" : "In Progress";

  await statusSelect(detail).selectOption(target);

  await expect(statusSelect(detail)).toHaveValue(target);
  await expect(statusSelect(detail)).not.toHaveAttribute("data-pending");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: column }).getByRole("article").first(),
  ).toHaveAttribute("aria-label", title);
});

test("clicking Priority cycles it, and the Board reflects the change", async ({ page }) => {
  const title = "Rate limit the Server Actions";
  const CYCLE = ["None", "Low", "Medium", "High", "Urgent"];
  await openBoard(page);
  const detail = await openTask(page, title);
  const from = (await priorityButton(detail).getAttribute("aria-label"))!.replace("Priority: ", "");
  const next = `Priority: ${CYCLE[(CYCLE.indexOf(from) + 1) % CYCLE.length]}`;

  await priorityButton(detail).click();

  await expect(priorityButton(detail)).toHaveAccessibleName(next);
  await expect(priorityButton(detail)).not.toHaveAttribute("data-pending");
  await page.keyboard.press("Escape");
  await expect(priorityButton(card(page, title))).toHaveAccessibleName(next);
});

test("Assignee and Labels save independently and survive a reload", async ({ page }) => {
  const title = "Fractional Rank for moves";
  await openBoard(page);
  const detail = await openTask(page, title);
  const assignee = { label: (await assigneeSelect(detail).inputValue()) ? "Unassigned" : "Maya Chen" };
  const docs = detail.getByRole("button", { name: "Docs" });
  const pressed = (await docs.getAttribute("aria-pressed")) === "true";

  await assigneeSelect(detail).selectOption(assignee);
  await docs.click();

  await expect(docs).toHaveAttribute("aria-pressed", String(!pressed));
  await expect(assigneeSelect(detail).locator("option:checked")).toHaveText(assignee.label);
  await expect(assigneeSelect(detail)).not.toHaveAttribute("data-pending");
  await expect(detail.getByRole("group", { name: "Labels" })).not.toHaveAttribute("data-pending");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card(page, title).getByText("Docs")).toHaveCount(pressed ? 0 : 1);
  await card(page, title).getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(/\/tasks\//);
  await page.reload();
  const main = page.getByRole("main");
  await expect(assigneeSelect(main).locator("option:checked")).toHaveText(assignee.label);
  await expect(main.getByRole("button", { name: "Docs" })).toHaveAttribute(
    "aria-pressed",
    String(!pressed),
  );
});

test("with Always fail on, each field rolls back on its own with a toast", async ({
  page,
  context,
}) => {
  await openBoard(page);
  await setDemoControls(page, context, { latency: "Off", failure: "Always" });
  const detail = await openTask(page, "Prisma schema and seed data");
  const status = await statusSelect(detail).inputValue();
  const assignee = await assigneeSelect(detail).inputValue();
  const priority = (await priorityButton(detail).getAttribute("aria-label"))!;
  const docs = detail.getByRole("button", { name: "Docs" });
  const docsPressed = (await docs.getAttribute("aria-pressed"))!;

  await statusSelect(detail).selectOption(status === "TODO" ? "DONE" : "TODO");
  await expect(page.getByText("Couldn't change the Status")).toBeVisible();
  await expect(statusSelect(detail)).toHaveValue(status);

  await assigneeSelect(detail).selectOption(assignee === "" ? { label: "Maya Chen" } : "");
  await expect(page.getByText("Couldn't change the Assignee")).toBeVisible();
  await expect(assigneeSelect(detail)).toHaveValue(assignee);

  await priorityButton(detail).click();
  await expect(page.getByText("Couldn't change the Priority")).toBeVisible();
  await expect(priorityButton(detail)).toHaveAccessibleName(priority);

  await docs.click();
  await expect(page.getByText("Couldn't change the Labels")).toBeVisible();
  await expect(docs).toHaveAttribute("aria-pressed", docsPressed);
});

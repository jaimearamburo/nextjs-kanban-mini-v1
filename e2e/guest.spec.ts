import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function guestCookie(context: BrowserContext) {
  const cookies = await context.cookies();
  return cookies.find((cookie) => cookie.name === "guest")?.value;
}

/** The header's Guest, e.g. "Curious Otter", once it has been shown. */
async function shownGuestName(page: Page) {
  const identity = page.getByRole("group", { name: /^You are / });
  await expect(identity).toBeVisible();
  const label = await identity.getAttribute("aria-label");
  return label!.replace("You are ", "");
}

test("a first visit gets a Guest, and a return visit keeps it", async ({ page, context }) => {
  await page.goto("/");

  const name = await shownGuestName(page);
  expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  await expect(page.getByRole("banner").getByText(name)).toBeVisible();
  const id = await guestCookie(context);
  expect(id).toMatch(UUID);

  await page.reload();

  expect(await shownGuestName(page)).toBe(name);
  expect(await guestCookie(context)).toBe(id);
});

test("re-rolling issues a new Guest", async ({ page, context }) => {
  await page.goto("/");
  await shownGuestName(page);
  const before = await guestCookie(context);

  await page.getByRole("button", { name: "New identity" }).click();

  await expect.poll(() => guestCookie(context)).not.toBe(before);
  expect(await guestCookie(context)).toMatch(UUID);
  await shownGuestName(page);
});

test("a malformed cookie is replaced with a new Guest without an error", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "guest", value: "not-a-guest", url: baseURL! }]);

  await page.goto("/");

  await shownGuestName(page);
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Board" })).toBeVisible();
  expect(await guestCookie(context)).toMatch(UUID);
});

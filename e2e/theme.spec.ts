import { expect, test, type Page } from "@playwright/test";

// Runs against a production build. These tests only read the page and set the
// theme cookie, which belongs to each test's own browser context.

/** Opens the Board and waits until it has hydrated, so clicks aren't lost. */
async function openBoard(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("group", { name: /^You are / })).toBeVisible();
}

function themeButton(page: Page, name: "Light" | "Dark" | "System") {
  return page.getByRole("group", { name: "Theme" }).getByRole("button", { name });
}

function html(page: Page) {
  return page.locator("html");
}

async function themeCookie(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "theme")?.value;
}

test("a first visit follows the OS", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await openBoard(page);
  await expect(html(page)).toHaveClass(/\bdark\b/);
  await expect(themeButton(page, "System")).toHaveAttribute("aria-pressed", "true");

  await page.emulateMedia({ colorScheme: "light" });
  await openBoard(page);
  await expect(html(page)).not.toHaveClass(/\bdark\b/);
});

test("a saved theme persists across reloads", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openBoard(page);

  await themeButton(page, "Dark").click();
  await expect(html(page)).toHaveClass(/\bdark\b/);
  expect(await themeCookie(page)).toBe("dark");

  await page.reload();
  await expect(html(page)).toHaveClass(/\bdark\b/);
  await expect(themeButton(page, "Dark")).toHaveAttribute("aria-pressed", "true");
});

test("the saved theme is on the page before any content", async ({ page, baseURL }) => {
  await page.context().addCookies([{ name: "theme", value: "dark", url: baseURL }]);
  await page.emulateMedia({ colorScheme: "light" });
  // Records <html>'s classes at the moment the parser creates <body>.
  await page.addInitScript(() => {
    new MutationObserver((_, observer) => {
      if (!document.body) return;
      observer.disconnect();
      (window as unknown as { classesAtBody: string }).classesAtBody =
        document.documentElement.className;
    }).observe(document, { childList: true, subtree: true });
  });

  await openBoard(page);

  const classes = await page.evaluate(
    () => (window as unknown as { classesAtBody: string }).classesAtBody,
  );
  expect(classes.split(" ")).toContain("dark");
});

test("System clears the saved theme and follows the OS again", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await openBoard(page);

  await themeButton(page, "Light").click();
  await expect(html(page)).not.toHaveClass(/\bdark\b/);

  await themeButton(page, "System").click();
  await expect(html(page)).toHaveClass(/\bdark\b/);
  expect(await themeCookie(page)).toBeUndefined();

  // Still following: a later OS change applies without a reload.
  await page.emulateMedia({ colorScheme: "light" });
  await expect(html(page)).not.toHaveClass(/\bdark\b/);
});

test("switching the theme snaps with no transitions", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openBoard(page);
  const chip = page.getByRole("group", { name: "Filter by Label" }).getByRole("button").first();

  await themeButton(page, "Dark").click();
  await expect(html(page)).toHaveClass(/\bdark\b/);

  const [running, colorNow] = await chip.evaluate((element) => [
    document.getAnimations().filter((animation) => animation instanceof CSSTransition).length,
    getComputedStyle(element).backgroundColor,
  ]);
  expect(running).toBe(0);

  await page.waitForTimeout(400);
  expect(await chip.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(colorNow);
});

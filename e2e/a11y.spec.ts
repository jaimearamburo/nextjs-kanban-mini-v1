import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Runs against a production build on the freshly seeded `test` database.
// These tests only read: opening the create form creates nothing.

const TITLE = "Fix the modal not closing on back";

/** Opens the Board in a theme and waits until it has hydrated. */
async function openBoard(page: Page, theme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: theme });
  await page.goto("/");
  await expect(page.getByRole("group", { name: /^You are / })).toBeVisible();
}

/** The seeded Task's title link on its card, which opens Task detail. */
function cardLink(page: Page) {
  return page
    .getByRole("region", { name: "Board" })
    .getByRole("article", { name: TITLE })
    .getByRole("link", { name: TITLE });
}

/** Fails with axe's WCAG 2 A and AA violations, listing each rule and its elements. */
async function expectNoViolations(page: Page) {
  // Let entrance animations finish, so axe reads final colours.
  await page.waitForTimeout(300);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  // One line per element: the rule, the element and, for contrast, its colours.
  expect(
    violations.flatMap(({ id, nodes }) =>
      nodes.map((node) => {
        const data = node.any[0]?.data as
          | { fgColor?: string; bgColor?: string; contrastRatio?: number }
          | undefined;
        const colours = data?.fgColor
          ? ` ${data.fgColor} on ${data.bgColor} = ${data.contrastRatio}`
          : "";
        return `${id}: ${node.target.join(" ")}${colours}`;
      }),
    ),
  ).toEqual([]);
}

/** An element's longest transition and animation, in seconds, and its animation's repeat count. */
function motionOf(element: Element) {
  const style = getComputedStyle(element);
  const longest = (list: string) => Math.max(...list.split(",").map((s) => parseFloat(s)));
  return {
    transition: longest(style.transitionDuration),
    animation: longest(style.animationDuration),
    iterations: style.animationIterationCount,
  };
}

test("with reduced motion, the modal doesn't slide in and skeletons don't pulse", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openBoard(page, "light");
  await cardLink(page).click();
  const dialog = page.getByRole("dialog", { name: TITLE });
  await expect(dialog).toBeVisible();

  const panel = await dialog.evaluate(motionOf);
  expect(panel.transition).toBeLessThan(0.001);
  // Skeletons pulse forever with full motion; reduced, once at most and instantly.
  await page.evaluate(() => {
    const skeleton = document.createElement("div");
    skeleton.className = "animate-pulse";
    skeleton.id = "pulse-probe";
    document.body.append(skeleton);
  });
  const pulse = await page.locator("#pulse-probe").evaluate(motionOf);
  expect(pulse.animation).toBeLessThan(0.001);
  expect(pulse.iterations).toBe("1");
});

/** The focus ring's fixed colour in each theme, the same in every browser. */
const RING = { light: "rgba(0, 95, 204, 0.7)", dark: "rgba(76, 154, 255, 0.7)" };

for (const theme of ["light", "dark"] as const) {
  test.describe(`in the ${theme} theme`, () => {
    test("keyboard focus shows the same translucent blue ring on each control", async ({
      page,
    }) => {
      await openBoard(page, theme);
      // The first few stops: the brand, the theme buttons and Create's link,
      // a mix of plain links, shadcn buttons and our own controls.
      for (let stop = 0; stop < 6; stop++) {
        await page.keyboard.press("Tab");
        const element = await page.evaluate(() => document.activeElement!.outerHTML.slice(0, 80));
        // Polled: shadcn's buttons fade their ring in (transition-all).
        await expect
          .poll(
            () =>
              page.evaluate(() => {
                const style = getComputedStyle(document.activeElement!);
                // A ring utility draws a box-shadow; the base style an outline.
                return `${style.boxShadow} ${style.outlineStyle === "solid" ? style.outlineColor : ""}`;
              }),
            { message: element },
          )
          .toContain(RING[theme]);
      }
    });

    test("the Board passes automated accessibility checks", async ({ page }) => {
      await openBoard(page, theme);
      await expectNoViolations(page);
    });

    test("Task detail passes automated accessibility checks", async ({ page }) => {
      await openBoard(page, theme);
      await cardLink(page).click();
      const dialog = page.getByRole("dialog", { name: TITLE });
      await expect(dialog.getByRole("region", { name: "Comments" })).toBeVisible();
      await expect(dialog.getByRole("textbox", { name: "Add a Comment" })).toBeVisible();
      await expectNoViolations(page);
    });

    test("Create passes automated accessibility checks", async ({ page }) => {
      await openBoard(page, theme);
      await page.getByRole("link", { name: "Create a Task", exact: true }).click();
      await expect(
        page.getByRole("dialog", { name: "Create Task" }).getByRole("textbox", { name: /Title/ }),
      ).toBeVisible();
      await expectNoViolations(page);
    });
  });
}

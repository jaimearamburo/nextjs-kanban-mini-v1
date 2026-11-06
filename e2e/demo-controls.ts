import { expect, type BrowserContext, type Page } from "@playwright/test";

/** Sets this browser's demo controls through the header popover and waits until they're saved. */
export async function setDemoControls(
  page: Page,
  context: BrowserContext,
  { latency, failure }: { latency: string; failure: string },
) {
  await page.getByRole("button", { name: /^Demo controls/ }).click();
  const dialog = page.getByRole("dialog", { name: "Demo controls" });
  await dialog.getByRole("radiogroup", { name: "Latency" }).getByRole("radio", { name: latency }).click();
  await dialog.getByRole("radiogroup", { name: "Failures" }).getByRole("radio", { name: failure }).click();
  // Wait until the settings are saved before reloading or clicking on.
  await expect
    .poll(async () => {
      const cookie = (await context.cookies()).find((c) => c.name === "demo-controls");
      return cookie && JSON.parse(decodeURIComponent(cookie.value));
    })
    .toEqual({
      latency: { Off: "off", "1s": "1s", "3s": "3s" }[latency],
      failure: { Off: "off", "30% random": "random", Always: "always" }[failure],
    });
  await page.keyboard.press("Escape");
}

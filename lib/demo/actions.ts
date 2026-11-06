"use server";

import { demoSettings, saveDemoSettings } from "./index";

/**
 * Saves the demo controls for this browser. Not itself subject to them, so
 * "Always fail" can always be turned off again.
 */
export async function updateDemoSettings(input: unknown): Promise<void> {
  await saveDemoSettings(demoSettings.parse(input));
}

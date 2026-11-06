"use server";

import type { ActionResult } from "@/lib/action-result";
import { runDemoControls } from "@/lib/demo";
import { requireGuest, rerollCurrentGuest } from "./index";

/**
 * Gives a visitor without a valid Guest a new one. Harmless if they have one.
 * Not subject to the demo controls: it runs unseen on page load, and if it
 * failed the header would wait for a Guest forever.
 */
export async function startGuestSession(): Promise<void> {
  await requireGuest();
}

/** "New identity": issues the visitor a fresh Guest. */
export async function rerollGuest(): Promise<ActionResult> {
  const demo = await runDemoControls();
  if (!demo.ok) return demo;
  await rerollCurrentGuest();
  return { ok: true };
}

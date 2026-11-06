"use server";

import { requireGuest, rerollCurrentGuest } from "./index";

/** Gives a visitor without a valid Guest a new one. Harmless if they have one. */
export async function startGuestSession(): Promise<void> {
  await requireGuest();
}

/** "New identity": issues the visitor a fresh Guest. */
export async function rerollGuest(): Promise<void> {
  await rerollCurrentGuest();
}

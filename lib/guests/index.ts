import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createGuests, type Guest } from "./guests";

export type { Guest };

const guests = createGuests(db);

const GUEST_COOKIE = "guest";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * The visitor's Guest, or null if they have none yet (first visit, or a
 * malformed or unknown cookie). Reads the request, so call it inside Suspense.
 */
export async function getCurrentGuest(): Promise<Guest | null> {
  // Not cached: one primary-key read, and it must agree with what Server
  // Actions see (a cached Guest could outlive a database reset).
  return guests.findGuest((await cookies()).get(GUEST_COOKIE)?.value);
}

/**
 * The Guest acting in a Server Action. A visitor without a valid Guest gets a
 * new one, so every write is attributed. Server Actions only: it may set the
 * cookie.
 */
export async function requireGuest(): Promise<Guest> {
  const store = await cookies();
  const { guest, created } = await guests.ensureGuest(store.get(GUEST_COOKIE)?.value);
  if (created) await rememberGuest(guest);
  return guest;
}

/** Replaces the visitor's Guest with one of a different name. Server Actions only. */
export async function rerollCurrentGuest(): Promise<void> {
  const store = await cookies();
  await rememberGuest(await guests.rerollGuest(store.get(GUEST_COOKIE)?.value));
}

async function rememberGuest(guest: Guest): Promise<void> {
  (await cookies()).set(GUEST_COOKIE, guest.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

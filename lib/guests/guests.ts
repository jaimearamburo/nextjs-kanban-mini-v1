import { z } from "zod";
import type { Database } from "@/lib/db/client";
import { generateGuestIdentity } from "./identity";

/** A visitor's anonymous identity. Guests perform all actions. */
export type Guest = { id: string; name: string; color: string };

const fields = { id: true, name: true, color: true } as const;

/** The Guest cookie holds only the Guest's id. Anything else is rejected. */
const guestId = z.uuid();

/** The Guest id in a cookie value, or null if it is missing or malformed. */
function parseGuestId(cookieValue: string | undefined): string | null {
  const result = guestId.safeParse(cookieValue);
  return result.success ? result.data : null;
}

/**
 * The Guests module: who a visitor is. Its only dependency is the database;
 * reading and writing the cookie is left to the caller.
 */
export function createGuests(
  db: Database,
  { random = Math.random }: { random?: () => number } = {},
) {
  /** A brand-new Guest. Names may repeat; the id is what identifies a Guest. */
  async function createGuest(): Promise<Guest> {
    return db.guest.create({ data: generateGuestIdentity(random), select: fields });
  }

  // How many draws a re-roll gets to land on a name other than the current one.
  const REROLL_ATTEMPTS = 10;

  /** The Guest with this id, or null if there is none or the id is malformed. */
  async function findGuest(id: string | undefined): Promise<Guest | null> {
    const parsed = parseGuestId(id);
    if (!parsed) return null;
    return db.guest.findUnique({ where: { id: parsed }, select: fields });
  }

  return {
    createGuest,
    findGuest,
    /** The Guest the cookie names, or a new Guest if there is none. */
    async ensureGuest(
      cookieValue: string | undefined,
    ): Promise<{ guest: Guest; created: boolean }> {
      const existing = await findGuest(cookieValue);
      if (existing) return { guest: existing, created: false };
      return { guest: await createGuest(), created: true };
    },
    /**
     * "New identity": a new Guest whose name differs from the current one, so
     * the visitor sees a change. The old Guest is kept for its past actions.
     */
    async rerollGuest(cookieValue: string | undefined): Promise<Guest> {
      const current = await findGuest(cookieValue);
      let identity = generateGuestIdentity(random);
      for (let i = 1; i < REROLL_ATTEMPTS && identity.name === current?.name; i++) {
        identity = generateGuestIdentity(random);
      }
      return db.guest.create({ data: identity, select: fields });
    },
  };
}

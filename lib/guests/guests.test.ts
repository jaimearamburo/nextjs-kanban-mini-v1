import { beforeEach, describe, expect, test } from "vitest";
import { wipeDatabase } from "@/lib/db/reset";
import { testDb } from "@/test/database";
import { createGuests } from "./guests";
import { ADJECTIVES, ANIMALS, GUEST_COLORS } from "./identity";

const guests = createGuests(testDb);

beforeEach(async () => {
  await wipeDatabase(testDb);
});

describe("ensureGuest", () => {
  test("on a first visit, with no cookie, creates a Guest with a generated identity", async () => {
    const { guest, created } = await guests.ensureGuest(undefined);

    expect(created).toBe(true);
    const [adjective, animal] = guest.name.split(" ");
    expect(ADJECTIVES).toContain(adjective);
    expect(ANIMALS).toContain(animal);
    expect(GUEST_COLORS).toContain(guest.color);
    expect(await guests.findGuest(guest.id)).toEqual(guest);
  });

  test("on a return visit, keeps the Guest the cookie names", async () => {
    const { guest: first } = await guests.ensureGuest(undefined);

    const again = await guests.ensureGuest(first.id);

    expect(again).toEqual({ guest: first, created: false });
  });

  test.each([
    ["not a uuid", "curious-otter"],
    ["an injected value", "' OR 1=1 --"],
    ["empty", ""],
    ["a uuid with extra characters", "0195f3a1-0000-7000-8000-000000000001x"],
  ])("replaces a malformed cookie (%s) with a new Guest, without an error", async (_, cookie) => {
    const { guest: existing } = await guests.ensureGuest(undefined);

    const { guest, created } = await guests.ensureGuest(cookie);

    expect(created).toBe(true);
    expect(guest.id).not.toBe(existing.id);
    expect(await guests.findGuest(guest.id)).toEqual(guest);
  });

  test("replaces a well-formed cookie for an unknown Guest with a new Guest", async () => {
    const { guest, created } = await guests.ensureGuest("0195f3a1-0000-7000-8000-000000000001");

    expect(created).toBe(true);
    expect(guest.id).not.toBe("0195f3a1-0000-7000-8000-000000000001");
  });
});

describe("createGuest", () => {
  test("re-rolling gives a new Guest and keeps the old one, so its past actions stay attributed", async () => {
    const { guest: before } = await guests.ensureGuest(undefined);

    const after = await guests.createGuest();

    expect(after.id).not.toBe(before.id);
    expect(await guests.findGuest(before.id)).toEqual(before);
    expect(await guests.findGuest(after.id)).toEqual(after);
  });

  test("allows two Guests with the same name", async () => {
    const alwaysFirst = createGuests(testDb, { random: () => 0 });

    const one = await alwaysFirst.createGuest();
    const two = await alwaysFirst.createGuest();

    expect([one.name, two.name]).toEqual(["Curious Otter", "Curious Otter"]);
    expect(one.id).not.toBe(two.id);
  });
});

describe("rerollGuest", () => {
  test("gives a new Guest with a different name from the current one", async () => {
    // The first two draws repeat "Curious Otter"; the redraw must move on.
    const draws = [0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5];
    let i = 0;
    const rigged = createGuests(testDb, { random: () => draws[i++] ?? 0.5 });
    const current = await rigged.createGuest();

    const next = await rigged.rerollGuest(current.id);

    expect(current.name).toBe("Curious Otter");
    expect(next.name).not.toBe("Curious Otter");
    expect(next.id).not.toBe(current.id);
    expect(await rigged.findGuest(current.id)).toEqual(current);
  });

  test("works without a current Guest", async () => {
    const next = await guests.rerollGuest("not-a-uuid");

    expect(await guests.findGuest(next.id)).toEqual(next);
  });
});

describe("findGuest", () => {
  test("finds nothing for a malformed id, without an error", async () => {
    expect(await guests.findGuest("not-a-uuid")).toBeNull();
  });
});

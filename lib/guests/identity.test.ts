import { describe, expect, test } from "vitest";
import { ADJECTIVES, ANIMALS, GUEST_COLORS, generateGuestIdentity } from "./identity";

/** A random source that returns the given values in turn. */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("generateGuestIdentity", () => {
  test("names a Guest with an adjective and an animal, and picks an avatar colour", () => {
    expect(generateGuestIdentity(sequence(0))).toEqual({
      name: "Curious Otter",
      color: "violet",
    });
  });

  test("can reach the last adjective, animal and colour", () => {
    const identity = generateGuestIdentity(sequence(0.9999));

    expect(identity).toEqual({ name: "Breezy Wallaby", color: "fuchsia" });
  });

  test("draws the adjective, animal and colour independently", () => {
    const identity = generateGuestIdentity(sequence(0, 0.9999, 0));

    expect(identity).toEqual({ name: "Curious Wallaby", color: "violet" });
  });

  test("has pools of about 40 distinct adjectives and 40 distinct animals", () => {
    for (const pool of [ADJECTIVES, ANIMALS]) {
      expect(pool.length).toBeGreaterThanOrEqual(40);
      expect(new Set(pool).size).toBe(pool.length);
      for (const word of pool) expect(word).toMatch(/^[A-Z][a-z]+$/);
    }
  });

  test("with real randomness, always gives a name from the pools", () => {
    for (let i = 0; i < 200; i++) {
      const { name, color } = generateGuestIdentity();
      const [adjective, animal] = name.split(" ");
      expect(ADJECTIVES).toContain(adjective);
      expect(ANIMALS).toContain(animal);
      expect(GUEST_COLORS).toContain(color);
    }
  });
});

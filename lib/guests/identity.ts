// A Guest's generated identity: a creative adjective + animal name and an
// avatar colour. Names may repeat; the Guest's id is what identifies them.

export const ADJECTIVES = [
  "Curious", "Brave", "Clever", "Gentle", "Jolly", "Swift", "Quiet", "Bold",
  "Witty", "Calm", "Eager", "Fuzzy", "Happy", "Lucky", "Mighty", "Nimble",
  "Plucky", "Sunny", "Zesty", "Cosmic", "Dapper", "Fearless", "Glowing", "Humble",
  "Jazzy", "Kind", "Lively", "Merry", "Noble", "Peppy", "Quirky", "Radiant",
  "Snappy", "Spry", "Tidy", "Upbeat", "Vivid", "Wise", "Zippy", "Breezy",
] as const;

export const ANIMALS = [
  "Otter", "Fox", "Panda", "Koala", "Badger", "Falcon", "Heron", "Lynx",
  "Moose", "Narwhal", "Owl", "Penguin", "Quokka", "Raccoon", "Seal", "Tiger",
  "Walrus", "Wombat", "Yak", "Zebra", "Alpaca", "Beaver", "Camel", "Dolphin",
  "Eagle", "Gecko", "Hedgehog", "Ibis", "Jaguar", "Kiwi", "Lemur", "Marmot",
  "Newt", "Ocelot", "Puffin", "Robin", "Sloth", "Toucan", "Viper", "Wallaby",
] as const;

/** Avatar colour tokens for Guests, mapped to classes in the UI. */
export const GUEST_COLORS = [
  "violet", "emerald", "rose", "sky", "orange", "teal",
  "indigo", "pink", "amber", "lime", "cyan", "fuchsia",
] as const;

export type GuestIdentity = { name: string; color: string };

function pick<T>(pool: readonly T[], random: () => number): T {
  return pool[Math.floor(random() * pool.length)];
}

/** A fresh name and avatar colour. `random` returns a number in [0, 1). */
export function generateGuestIdentity(random: () => number = Math.random): GuestIdentity {
  const adjective = pick(ADJECTIVES, random);
  const animal = pick(ANIMALS, random);
  return { name: `${adjective} ${animal}`, color: pick(GUEST_COLORS, random) };
}

import { expect, test } from "vitest";
import { nextPriority, type Priority } from "./domain";

test("a Priority click cycles None → Low → Medium → High → Urgent → None", () => {
  const seen: Priority[] = ["NONE"];
  for (let i = 0; i < 5; i++) seen.push(nextPriority(seen[i]));

  expect(seen).toEqual(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT", "NONE"]);
});

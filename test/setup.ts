import { afterAll, beforeAll } from "vitest";
import { wipeDatabase } from "@/lib/db/reset";
import { testDb } from "./database";

// Each test file starts from an empty `test` database.
beforeAll(async () => {
  await wipeDatabase(testDb);
});

afterAll(async () => {
  await testDb.$disconnect();
});

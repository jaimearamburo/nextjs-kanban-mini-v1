import { config } from "dotenv";
import { createDatabase } from "@/lib/db/client";
import { assertNotProductionDatabase } from "@/lib/db/production-guard";

config({ path: ".env.local", quiet: true });

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is not set.");
assertNotProductionDatabase(url, process.env.PRODUCTION_DATABASE_HOST);

/** The disposable `test` database. Integration tests never touch `dev` or production. */
export const { db: testDb } = createDatabase(url);

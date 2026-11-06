// Applies pending migrations to the disposable `test` database.
import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import { assertNotProductionDatabase } from "@/lib/db/production-guard";

config({ path: ".env.local", quiet: true });

const url = process.env.TEST_DIRECT_URL;
if (!url) throw new Error("TEST_DIRECT_URL is not set.");
assertNotProductionDatabase(url, process.env.PRODUCTION_DATABASE_HOST);

execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DIRECT_URL: url },
});

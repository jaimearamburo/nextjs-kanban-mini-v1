import { config } from "dotenv";
import { createDatabase } from "@/lib/db/client";
import { assertNotProductionDatabase } from "@/lib/db/production-guard";

config({ path: ".env.local", quiet: true });

/**
 * The database a script works on: the `dev` database by default, or the
 * disposable `test` database with `--test`. Uses the direct (non-pooled)
 * connection when there is one. Refuses the production host, and needs an
 * explicit `--yes` because it replaces the database's contents (ADR-0006).
 */
export function connectToTargetDatabase(argv: string[] = process.argv) {
  if (!argv.includes("--yes")) {
    throw new Error(
      "This replaces everything in the database. Re-run with --yes to confirm.",
    );
  }
  const test = argv.includes("--test");
  const env = process.env;
  const url = test
    ? (env.TEST_DIRECT_URL ?? env.TEST_DATABASE_URL)
    : (env.DIRECT_URL ?? env.DATABASE_URL);
  const name = test ? "TEST_DIRECT_URL" : "DIRECT_URL";
  if (!url) throw new Error(`${name} is not set.`);

  assertNotProductionDatabase(url, env.PRODUCTION_DATABASE_HOST);

  return { ...createDatabase(url), label: test ? "test" : "dev" };
}

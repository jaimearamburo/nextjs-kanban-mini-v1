// Empties every table of the target database. Needs `--yes`; `--test` targets
// the test database.
import { wipeDatabase } from "@/lib/db/reset";
import { connectToTargetDatabase } from "./target-database";

async function main() {
  const { db, label } = connectToTargetDatabase();
  try {
    await wipeDatabase(db);
    console.log(`Reset the ${label} database.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

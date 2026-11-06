// Replaces the target database's contents with the demo Board.
// Needs `--yes`; `--test` targets the test database.
import { seedDatabase } from "@/lib/db/seed";
import { connectToTargetDatabase } from "./target-database";

async function main() {
  const { db, label } = connectToTargetDatabase();
  try {
    const counts = await seedDatabase(db);
    console.log(
      `Seeded the ${label} database: ${counts.tasks} Tasks, ${counts.labels} Labels, ${counts.teamMembers} Team Members, ${counts.comments} Comments.`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

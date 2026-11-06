// Runs only in Vercel Production builds, after migrations. Seeds the demo Board
// when the production database is empty (its first deploy), and otherwise does
// nothing. It never wipes data, so production is only ever touched from
// production (ADR-0006).
import { createDatabase } from "@/lib/db/client";
import { seedDatabase } from "@/lib/db/seed";

async function main() {
  if (process.env.VERCEL_ENV !== "production") {
    throw new Error("bootstrap-production only runs in Vercel Production builds.");
  }
  const url = process.env.DIRECT_URL;
  if (!url) throw new Error("DIRECT_URL is not set.");

  const { db } = createDatabase(url);
  try {
    const [tasks, labels] = await Promise.all([db.task.count(), db.label.count()]);
    if (tasks > 0 || labels > 0) {
      console.log("Production database already has data: not seeding.");
      return;
    }
    const counts = await seedDatabase(db);
    console.log(`Seeded the empty production database: ${counts.tasks} Tasks.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

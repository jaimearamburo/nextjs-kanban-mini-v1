import type { Database } from "./client";

/** Removes every row from every table. Never call this on production. */
export async function wipeDatabase(db: Database): Promise<void> {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "Activity", "Comment", "_LabelToTask", "Task", "Guest", "TeamMember", "Label" RESTART IDENTITY CASCADE',
  );
}

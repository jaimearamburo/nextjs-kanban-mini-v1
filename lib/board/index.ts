import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { createBoard } from "./board";
import { cacheTags } from "./cache-tags";

export * from "./domain";

const board = createBoard(db);

/** The Board, cached until a write invalidates the Board tag or a Task's tag. */
export async function getBoard() {
  "use cache";
  cacheLife("hours");
  const result = await board.getBoard();
  cacheTag(cacheTags.board);
  const taskTags = result.statuses.flatMap(({ tasks }) =>
    tasks.map((task) => cacheTags.task(task.id)),
  );
  // cacheTag accepts at most 128 tags per call.
  for (let i = 0; i < taskTags.length; i += 100) {
    cacheTag(...taskTags.slice(i, i + 100));
  }
  return result;
}

/**
 * A Task's detail, or null if the id is unknown, malformed or Archived.
 * Cached until a write invalidates the Task's tag.
 */
export async function getTask(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.task(id));
  return board.getTask(id);
}

/** Labels are seed data and never change, so they get the longest lifetime. */
export async function listLabels() {
  "use cache";
  cacheLife("max");
  return board.listLabels();
}

/** The Team Member roster is seed data and never changes. */
export async function listTeamMembers() {
  "use cache";
  cacheLife("max");
  return board.listTeamMembers();
}

/** Sets a Task's Priority. Server Actions call this, then update the cache tags. */
export const setPriority = board.setPriority;

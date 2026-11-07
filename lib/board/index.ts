import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { publishBoardChange } from "@/lib/realtime/server";
import { createBoard } from "./board";
import { cacheTags } from "./cache-tags";
import { boardFilter, type BoardFilter } from "./schemas";

export * from "./domain";

const board = createBoard(db, { publishChange: publishBoardChange });

/**
 * The Board narrowed by its search params (Label Filter and text search).
 * Malformed params are ignored.
 */
export async function getBoard(searchParams: unknown) {
  // Parsed before the cached read, so the cache is keyed by the normalised
  // filter rather than the raw URL (stray params, Label order, whitespace).
  return getFilteredBoard(boardFilter.parse(searchParams));
}

/** Cached per filter until a write invalidates the Board tag or a Task's tag. */
async function getFilteredBoard(filter: BoardFilter) {
  "use cache";
  cacheLife("hours");
  const result = await board.getBoard(filter);
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

/** Moves a Task between two cards. Server Actions call this, then update the cache tags. */
export const moveTask = board.moveTask;

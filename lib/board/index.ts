import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { createBoard } from "./board";
import { cacheTags } from "./cache-tags";

export * from "./domain";

const board = createBoard(db);

/**
 * The Board narrowed by its search params (Label Filter and text search).
 * Malformed params are ignored. Uncached: ADR-0008.
 *
 * `connection()` keeps the query out of prerendering, the runtime prefetch
 * included: opening a database connection draws a random SCRAM nonce
 * (`crypto.getRandomValues`), which Next refuses while prerendering.
 */
export async function getBoard(searchParams?: unknown) {
  await connection();
  return board.getBoard(searchParams);
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

/** Sets a Task's Priority. Server Actions call this, then update the Task's cache tag. */
export const setPriority = board.setPriority;

/** Task detail's other setters. Server Actions call these, then update the Task's cache tag. */
export const setStatus = board.setStatus;
export const setAssignee = board.setAssignee;
export const setLabels = board.setLabels;

/** Moves a Task between two cards. Server Actions call this, then update the Task's cache tag. */
export const moveTask = board.moveTask;

/**
 * Creates a Task at the top of its Status. The Board read is uncached, so
 * the Server Action refreshes the router rather than updating a tag.
 */
export const createTask = board.createTask;

/**
 * A Task's Comments. Uncached, so call it inside Suspense. Kept out of
 * prerendering for the same reason as getBoard.
 */
export async function listComments(taskId: unknown) {
  await connection();
  return board.listComments(taskId);
}

/** Comment writes. Server Actions call these, then refresh the router. */
export const addComment = board.addComment;
export const archiveComment = board.archiveComment;

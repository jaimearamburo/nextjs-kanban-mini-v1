import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { createBoard } from "./board";
import { cacheTags } from "./cache-tags";

export * from "./domain";

const board = createBoard(db);

/**
 * The Board narrowed by its search params (Label Filter and text search).
 * Malformed params are ignored. Uncached: ADR-0008.
 */
export const getBoard = board.getBoard;

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

/** A Task's Comments. Uncached, so call it inside Suspense. */
export const listComments = board.listComments;

/** Comment writes. Server Actions call these, then refresh the router. */
export const addComment = board.addComment;
export const archiveComment = board.archiveComment;

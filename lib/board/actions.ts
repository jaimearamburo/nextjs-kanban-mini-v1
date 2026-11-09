"use server";

import { refresh, updateTag } from "next/cache";
import { runDemoControls } from "@/lib/demo";
import { requireGuest, type Guest } from "@/lib/guests";
import { cacheTags } from "./cache-tags";
import type { Priority, Status, WriteResult } from "./domain";
import {
  addComment,
  archiveComment,
  getTask,
  moveTask,
  setAssignee,
  setLabels,
  setPriority,
  setStatus,
} from "./index";
import type { MoveTaskInput } from "./schemas";

/** The standard Server Action: Guest, demo controls, the write, then the Task's cache tag. */
async function writeTask(
  taskId: string,
  write: (guest: Guest) => Promise<WriteResult>,
): Promise<WriteResult> {
  const guest = await requireGuest();
  const demo = await runDemoControls();
  if (!demo.ok) return demo;
  const result = await write(guest);
  if (result.ok) {
    updateTag(cacheTags.task(taskId));
    // Refills the Task's cache entry now, so the old one can't be served (ADR-0008).
    await getTask(taskId);
  }
  return result;
}

/** Sets a Task's Priority to the final value the Guest sees (ADR-0004). */
export async function setTaskPriority(taskId: string, priority: Priority) {
  return writeTask(taskId, (guest) => setPriority(guest, { taskId, priority }));
}

/** Sets a Task's Status, putting it at the top of the new Status. */
export async function setTaskStatus(taskId: string, status: Status) {
  return writeTask(taskId, (guest) => setStatus(guest, { taskId, status }));
}

/** Sets a Task's Assignee; an empty id (the select's "Unassigned") unassigns. */
export async function setTaskAssignee(taskId: string, assigneeId: string) {
  return writeTask(taskId, (guest) =>
    setAssignee(guest, { taskId, assigneeId: assigneeId === "" ? null : assigneeId }),
  );
}

/** Sets a Task's Labels to the final set the Guest sees (ADR-0004). */
export async function setTaskLabels(taskId: string, labelIds: string[]) {
  return writeTask(taskId, (guest) => setLabels(guest, { taskId, labelIds }));
}

/**
 * Moves a Task to `status`, between the cards it was dropped between as the
 * Guest saw them: `beforeId` above it (null at the top), `afterId` below it
 * (null at the bottom).
 */
export async function moveTaskBetween(taskId: string, move: Omit<MoveTaskInput, "taskId">) {
  return writeTask(taskId, (guest) => moveTask(guest, { taskId, ...move }));
}

/** The Comment Server Action: Comments are uncached, so it refreshes rather than updates a tag. */
async function writeComment(write: (guest: Guest) => Promise<WriteResult>): Promise<WriteResult> {
  const guest = await requireGuest();
  const demo = await runDemoControls();
  if (!demo.ok) return demo;
  const result = await write(guest);
  if (result.ok) refresh();
  return result;
}

/** Adds the Guest's Comment to a Task. */
export async function addTaskComment(taskId: string, body: string) {
  return writeComment((guest) => addComment(guest, { taskId, body }));
}

/** Archives a Comment, whoever wrote it (ADR-0002). */
export async function archiveTaskComment(commentId: string) {
  return writeComment((guest) => archiveComment(guest, { commentId }));
}

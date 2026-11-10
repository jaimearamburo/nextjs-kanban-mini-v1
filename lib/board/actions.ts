"use server";

import { refresh, updateTag } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { runDemoControls } from "@/lib/demo";
import { requireGuest, type Guest } from "@/lib/guests";
import { cacheTags } from "./cache-tags";
import type { CreateTaskResult, Priority, Status, WriteResult } from "./domain";
import {
  addComment,
  archiveComment,
  createTask,
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

/**
 * The Server Action for writes to uncached reads (Comments, and the Board
 * itself: ADR-0008): Guest, demo controls, the write, then a router refresh
 * rather than a tag update.
 */
async function writeAndRefresh<R extends ActionResult>(
  write: (guest: Guest) => Promise<R>,
): Promise<R | Extract<ActionResult, { ok: false }>> {
  const guest = await requireGuest();
  const demo = await runDemoControls();
  if (!demo.ok) return demo;
  const result = await write(guest);
  if (result.ok) refresh();
  return result;
}

/** A form field's text, or undefined when the field wasn't sent (so its default applies). */
function formText(formData: FormData, name: string) {
  const value = formData.get(name);
  return value === null ? undefined : value;
}

/**
 * Creates a Task from the create form. An empty Assignee (the select's
 * "Unassigned") is none; Labels are the ones toggled on.
 */
export async function createBoardTask(formData: FormData): Promise<CreateTaskResult> {
  const assigneeId = formText(formData, "assigneeId");
  return writeAndRefresh((guest) =>
    createTask(guest, {
      title: formText(formData, "title"),
      description: formText(formData, "description"),
      status: formText(formData, "status"),
      priority: formText(formData, "priority"),
      assigneeId: assigneeId === "" ? null : assigneeId,
      labelIds: formData.getAll("labelIds"),
    }),
  );
}

/** Adds the Guest's Comment to a Task. */
export async function addTaskComment(taskId: string, body: string) {
  return writeAndRefresh((guest) => addComment(guest, { taskId, body }));
}

/** Archives a Comment, whoever wrote it (ADR-0002). */
export async function archiveTaskComment(commentId: string) {
  return writeAndRefresh((guest) => archiveComment(guest, { commentId }));
}

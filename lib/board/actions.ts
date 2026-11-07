"use server";

import { updateTag } from "next/cache";
import { runDemoControls } from "@/lib/demo";
import { requireGuest } from "@/lib/guests";
import { cacheTags } from "./cache-tags";
import type { Priority, WriteResult } from "./domain";
import { moveTask, setPriority } from "./index";
import type { MoveTaskInput } from "./schemas";

/** Sets a Task's Priority to the final value the Guest sees (ADR-0004). */
export async function setTaskPriority(
  taskId: string,
  priority: Priority,
): Promise<WriteResult> {
  const guest = await requireGuest();
  const demo = await runDemoControls();
  if (!demo.ok) return demo;
  const result = await setPriority(guest, { taskId, priority });
  if (result.ok) {
    updateTag(cacheTags.board);
    updateTag(cacheTags.task(taskId));
  }
  return result;
}

/**
 * Moves a Task to `status`, between the cards it was dropped between as the
 * Guest saw them: `beforeId` above it (null at the top), `afterId` below it
 * (null at the bottom).
 */
export async function moveTaskBetween(
  taskId: string,
  move: Omit<MoveTaskInput, "taskId">,
): Promise<WriteResult> {
  const guest = await requireGuest();
  const demo = await runDemoControls();
  if (!demo.ok) return demo;
  const result = await moveTask(guest, { taskId, ...move });
  if (result.ok) {
    updateTag(cacheTags.board);
    updateTag(cacheTags.task(taskId));
  }
  return result;
}

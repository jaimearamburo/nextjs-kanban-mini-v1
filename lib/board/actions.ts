"use server";

import { updateTag } from "next/cache";
import { runDemoControls } from "@/lib/demo";
import { requireGuest } from "@/lib/guests";
import { cacheTags } from "./cache-tags";
import type { Priority, WriteResult } from "./domain";
import { setPriority } from "./index";

/** Sets a Task's Priority to the final value the Guest sees (ADR-0004). */
export async function setTaskPriority(
  taskId: string,
  priority: Priority,
): Promise<WriteResult> {
  await requireGuest();
  const demo = await runDemoControls();
  if (!demo.ok) return demo;
  const result = await setPriority({ taskId, priority });
  if (result.ok) {
    updateTag(cacheTags.board);
    updateTag(cacheTags.task(taskId));
  }
  return result;
}

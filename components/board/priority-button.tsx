"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import {
  nextPriority,
  PRIORITY_NAMES,
  type Priority,
  type WriteResult,
} from "@/lib/board/domain";
import { cn } from "@/lib/utils";
import { PriorityIcon } from "./priority-icon";

/**
 * A Task's Priority, an icon on its card or, with `showName`, an icon and
 * its name in Task detail: a click cycles None → Low → Medium → High → Urgent → None
 * instantly. `changeAction` gets the final value shown, never "cycle"
 * (ADR-0004); if it fails, the shown value rolls back and a toast explains.
 */
export function PriorityButton({
  priority,
  changeAction,
  showName = false,
}: {
  priority: Priority;
  showName?: boolean;
  changeAction: (priority: Priority) => Promise<WriteResult>;
}) {
  const [optimisticPriority, setOptimisticPriority] = useOptimistic(priority);
  const [isPending, startTransition] = useTransition();
  const name = PRIORITY_NAMES[optimisticPriority];

  function handleClick() {
    // Read from the optimistic value, so rapid clicks keep cycling from what's shown.
    const next = nextPriority(optimisticPriority);
    startTransition(async () => {
      setOptimisticPriority(next);
      const result = await changeAction(next);
      if (!result.ok) {
        toast.error("Couldn't change the Priority", { description: result.error });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Priority: ${name}`}
      title={`Priority: ${name}. Click to change.`}
      data-pending={isPending || undefined}
      className={cn(
        "group/priority inline-flex cursor-pointer items-center justify-center rounded-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-pending:animate-pulse",
        showName ? "h-8 gap-1.5 px-2 pointer-coarse:h-10" : "size-6",
        // On a card, a 40px tap target that doesn't make the card taller.
        !showName && "pointer-coarse:-m-2 pointer-coarse:size-10",
      )}
    >
      <PriorityIcon
        priority={optimisticPriority}
        className={cn(
          // Priority None shows nothing until the card is hovered or the
          // control focused, to keep cards clean as in Jira.
          !showName &&
            optimisticPriority === "NONE" &&
            "invisible group-hover:visible group-focus-visible/priority:visible pointer-coarse:visible pointer-coarse:opacity-40",
        )}
      />
      {showName && name}
    </button>
  );
}

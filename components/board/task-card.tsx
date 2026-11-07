import Link from "next/link";
import type { ComponentProps } from "react";
import { setTaskPriority } from "@/lib/board/actions";
import type { BoardTask } from "@/lib/board/domain";
import { cn } from "@/lib/utils";
import { AssigneeAvatar } from "./assignee-avatar";
import { DropLine, type DropEdge } from "./drop-line";
import { LabelBadge } from "./label-badge";
import { PriorityButton } from "./priority-button";

/**
 * A Task's card. `dropEdge` draws the drop line on that edge while a dragged
 * card would land there.
 */
export function TaskCard({
  task,
  dropEdge,
  className,
  ...props
}: {
  task: BoardTask;
  dropEdge?: DropEdge;
} & ComponentProps<"article">) {
  return (
    <article
      aria-label={task.title}
      className={cn(
        "group relative rounded-md border border-border/70 bg-card p-3 shadow-xs dark:border-border",
        className,
      )}
      {...props}
    >
      {dropEdge && <DropLine edge={dropEdge} />}
      <h3 className="text-sm leading-snug font-medium text-card-foreground">
        {/* Only the title opens the Task, so a click meant for the Priority
            control or a drag never opens it by accident. */}
        <Link
          // The card is dragged, never the link (the browser's own link drag).
          draggable={false}
          href={`/tasks/${task.id}`}
          // Per-link prefetch also loads the cached Task, not just the route's
          // shell, so the detail is ready the moment the title is clicked.
          prefetch
          className="rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {task.title}
        </Link>
      </h3>
      <div className="mt-3 flex items-end justify-between gap-2">
        <ul className="flex min-w-0 flex-wrap gap-1" aria-label="Labels">
          {task.labels.map((label) => (
            <li key={label.id}>
              <LabelBadge label={label} />
            </li>
          ))}
        </ul>
        <div className="flex shrink-0 items-center gap-1.5">
          <PriorityButton
            priority={task.priority}
            changeAction={setTaskPriority.bind(null, task.id)}
          />
          <AssigneeAvatar assignee={task.assignee} />
        </div>
      </div>
    </article>
  );
}

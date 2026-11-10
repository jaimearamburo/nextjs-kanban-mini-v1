"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";
import { setTaskPriority } from "@/lib/board/actions";
import type { BoardTask, Status } from "@/lib/board/domain";
import { cn } from "@/lib/utils";
import { AssigneeAvatar } from "./assignee-avatar";
import { DropLine, type DropEdge } from "./drop-line";
import { LabelBadge } from "./label-badge";
import { MoveToMenu } from "./move-to-menu";
import { PriorityButton } from "./priority-button";

/**
 * A Task's card. `dropEdge` draws the drop line on that edge while a dragged
 * card would land there; `moveAction` adds the "Move to…" menu.
 */
export function TaskCard({
  task,
  dropEdge,
  moveAction,
  className,
  ...props
}: {
  task: BoardTask;
  dropEdge?: DropEdge;
  moveAction?: (taskId: string, status: Status) => void;
} & ComponentProps<"article">) {
  // Intent ends when the pointer leaves or focus moves on, so a card hovered
  // once isn't prefetched again after every later write.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const intent = hovered || focused;
  return (
    <article
      aria-label={task.title}
      className={cn(
        "group relative rounded-md border border-border/70 bg-card p-3 shadow-xs dark:border-border",
        className,
      )}
      {...props}
      onMouseEnter={(event) => {
        setHovered(true);
        props.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setHovered(false);
        props.onMouseLeave?.(event);
      }}
    >
      {dropEdge && <DropLine edge={dropEdge} />}
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-sm leading-snug font-medium text-card-foreground">
          {/* Only the title opens the Task, so a click meant for the Priority
              control or a drag never opens it by accident. */}
          <Link
            // The card is dragged, never the link (the browser's own link drag).
            draggable={false}
            href={`/tasks/${task.id}`}
            // On intent only (Next's advice for a grid of cards): while the
            // card is hovered or the title focused, the per-link prefetch
            // loads the route and the cached Task, so the detail is ready when
            // it's clicked. Not "auto": that still fetches a route tree per
            // card, again after every write, which clears the router cache.
            prefetch={intent}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {task.title}
          </Link>
        </h3>
        {moveAction && (
          <MoveToMenu status={task.status} moveAction={(status) => moveAction(task.id, status)} />
        )}
      </div>
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
            changeAction={(priority) => setTaskPriority(task.id, priority)}
          />
          <AssigneeAvatar assignee={task.assignee} />
        </div>
      </div>
    </article>
  );
}

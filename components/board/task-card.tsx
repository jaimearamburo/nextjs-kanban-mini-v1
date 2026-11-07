import Link from "next/link";
import { setTaskPriority } from "@/lib/board/actions";
import type { BoardTask } from "@/lib/board/domain";
import { AssigneeAvatar } from "./assignee-avatar";
import { LabelBadge } from "./label-badge";
import { PriorityButton } from "./priority-button";

export function TaskCard({ task }: { task: BoardTask }) {
  return (
    <article
      aria-label={task.title}
      className="group rounded-md border border-border/70 bg-card p-3 shadow-xs dark:border-border"
    >
      <h3 className="text-sm leading-snug font-medium text-card-foreground">
        {/* Only the title opens the Task, so a click meant for the Priority
            control (or, later, a drag) never opens it by accident. */}
        <Link
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

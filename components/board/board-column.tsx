import type { ReactNode } from "react";
import { STATUS_NAMES, type Status } from "@/lib/board/domain";

/** One Status, shown as a column. Fixed width so columns never squash. */
export function BoardColumn({
  status,
  count,
  children,
}: {
  status: Status;
  count: ReactNode;
  children: ReactNode;
}) {
  const headingId = `column-${status}`;
  return (
    <section
      aria-labelledby={headingId}
      data-status={status}
      className="flex w-70 shrink-0 flex-col rounded-lg bg-muted/70 dark:bg-muted/40"
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <h2
          id={headingId}
          className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
        >
          {STATUS_NAMES[status]}
        </h2>
        <span className="rounded-full bg-background/80 px-1.5 text-xs font-medium text-muted-foreground tabular-nums dark:bg-background/40">
          {count}
        </span>
      </header>
      <div className="relative flex flex-col gap-2 px-2 pb-2">
        {children}
      </div>
    </section>
  );
}

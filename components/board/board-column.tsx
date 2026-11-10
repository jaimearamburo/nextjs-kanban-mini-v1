import type { ReactNode } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { STATUS_NAMES, type Status } from "@/lib/board/domain";

/**
 * One Status, shown as a column. Fixed width so columns never squash.
 * The + at the right of its header opens the create form with this Status chosen.
 */
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
      className="flex w-70 shrink-0 snap-start flex-col rounded-lg bg-muted/70 dark:bg-muted/40"
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
        <Link
          href={{ pathname: "/tasks/new", query: { status } }}
          aria-label={`Create a Task in ${STATUS_NAMES[status]}`}
          title={`Create a Task in ${STATUS_NAMES[status]}`}
          // -my-1 keeps the header's height: the circle is taller than the text.
          // On touch the link is a 40px tap target around the same small
          // circle, its negative margins keeping the header as it is.
          className="group/create -my-1 ml-auto flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:-my-2 pointer-coarse:-mr-2 pointer-coarse:size-10"
        >
          <span className="flex size-6 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground group-hover/create:bg-background group-hover/create:text-foreground dark:bg-background/30 dark:group-hover/create:bg-background/60">
            <PlusIcon className="size-3.5" aria-hidden />
          </span>
        </Link>
      </header>
      <div className="relative flex flex-col gap-2 px-2 pb-2">
        {children}
      </div>
    </section>
  );
}

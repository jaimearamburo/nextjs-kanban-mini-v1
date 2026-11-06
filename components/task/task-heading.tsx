import type { ReactNode } from "react";
import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Where a Task is shown: as a modal over the Board, or as a full page. */
export type TaskView = "modal" | "page";

/** A Task view's main heading: the modal's accessible title, or the page's h1. */
export function TaskHeading({
  view,
  className,
  children,
}: {
  view: TaskView;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn("text-lg leading-snug font-semibold tracking-tight", className);
  return view === "modal" ? (
    <DialogTitle className={classes}>{children}</DialogTitle>
  ) : (
    <h1 className={classes}>{children}</h1>
  );
}

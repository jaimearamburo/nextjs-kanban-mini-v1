import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TaskView } from "./task-heading";

/**
 * The Task detail's columns. Sized by its container, not the screen, so the
 * side panel and the full page both put Activity beside the Task once they're
 * wide enough (@4xl, 56rem), and under the Task when they aren't.
 */
export function TaskDetailLayout({
  view,
  activity,
  children,
}: {
  view: TaskView;
  activity: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="@container flex min-h-full flex-col">
      <div className="grid gap-6 @4xl:flex-1 @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:gap-10">
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
        <div
          className={cn(
            "@4xl:border-l @4xl:pl-6",
            view === "modal"
              ? // In the side panel the divider runs its full height: through
                // the panel's 2rem top and bottom padding (sm:p-8 in
                // TaskModal), from just under the header to the bottom edge.
                // The top padding keeps Activity clear of the close button.
                "@4xl:-my-8 @4xl:pt-20 @4xl:pb-8"
              : "@4xl:pt-12",
          )}
        >
          {activity}
        </div>
      </div>
    </div>
  );
}

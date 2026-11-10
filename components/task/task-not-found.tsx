import { SearchX } from "lucide-react";
import { TaskHeading, type TaskView } from "./task-heading";

/** What an unknown or Archived Task URL shows, in the modal or on the full page. */
export function TaskNotFound({ view }: { view: TaskView }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <SearchX className="size-8 text-muted-foreground" aria-hidden />
      <TaskHeading view={view} className="text-base">
        Task not found
      </TaskHeading>
      <p className="max-w-sm text-sm text-muted-foreground">
        This Task doesn&apos;t exist.
      </p>
    </div>
  );
}

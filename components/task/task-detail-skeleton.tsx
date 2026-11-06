import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetailLayout } from "./task-detail-layout";
import type { TaskView } from "./task-heading";

/**
 * Shown in the static shell while a Task's detail streams in. Uses the
 * detail's own layout, Activity column included, so nothing jumps.
 */
export function TaskDetailSkeleton({ view }: { view: TaskView }) {
  return (
    <div aria-busy="true" aria-label="Loading the Task" className="contents">
      <TaskDetailLayout
        view={view}
        activity={
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        }
      >
        <Skeleton className="h-6 w-3/4" />
        <div className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3">
          {Array.from({ length: 4 }, (_, row) => (
            <div key={row} className="contents">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </TaskDetailLayout>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

/** Shown in the static shell while a Task's detail streams in. */
export function TaskDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the Task" className="flex flex-col gap-6">
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
    </div>
  );
}

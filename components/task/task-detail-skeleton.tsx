import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown in the static shell while a Task's detail streams in. Mirrors the
 * detail's layout, Activity column included, so nothing jumps when it arrives.
 */
export function TaskDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the Task" className="@container">
      <div className="grid gap-6 @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:gap-10">
        <div className="flex flex-col gap-6">
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
        <div className="flex flex-col gap-2 @4xl:border-l @4xl:pt-12 @4xl:pl-6">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}

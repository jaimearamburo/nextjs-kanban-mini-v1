import { Skeleton } from "@/components/ui/skeleton";
import { BoardToolbarLayout } from "./board-toolbar";

/** Shown in the static shell while the search params are read. */
export function BoardToolbarSkeleton() {
  return (
    <BoardToolbarLayout>
      <Skeleton className="h-8 w-full sm:w-64" />
      <div className="flex gap-1.5">
        {[20, 18, 12, 16, 12, 14].map((width, index) => (
          <Skeleton key={index} className="h-7 rounded-full" style={{ width: `${width * 4}px` }} />
        ))}
      </div>
    </BoardToolbarLayout>
  );
}

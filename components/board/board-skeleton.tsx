import { Skeleton } from "@/components/ui/skeleton";
import { STATUSES } from "@/lib/board/domain";
import { BoardColumn } from "./board-column";
import { BoardLayout } from "./board-layout";

const cardsPerColumn = [4, 3, 2, 3];

/** Shown in the static shell while the Board streams in. */
export function BoardSkeleton() {
  return (
    <BoardLayout aria-busy="true" aria-label="Loading the Board">
      {STATUSES.map((status, index) => (
        <BoardColumn
          key={status}
          status={status}
          count={<Skeleton className="h-3 w-3 bg-background/70" />}
        >
          {Array.from({ length: cardsPerColumn[index] }, (_, card) => (
            <div
              key={card}
              className="rounded-md border border-border/70 bg-card p-3 shadow-xs"
            >
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="mt-2 h-4 w-1/2" />
              <div className="mt-3 flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="size-6 rounded-full" />
              </div>
            </div>
          ))}
        </BoardColumn>
      ))}
    </BoardLayout>
  );
}

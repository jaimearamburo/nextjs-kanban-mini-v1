import { SearchX } from "lucide-react";
import { getBoard } from "@/lib/board";
import { boardFilter, isFiltered } from "@/lib/board/schemas";
import { DraggableBoard } from "./draggable-board";

export async function Board({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const params = await searchParams;
  // Read per request, never baked into the prerendered shell (see getBoard).
  const board = await getBoard(params);
  const noMatches =
    isFiltered(boardFilter.parse(params)) &&
    board.statuses.every(({ tasks }) => tasks.length === 0);
  return (
    <>
      {/* Always rendered, so screen readers announce the message when it appears. */}
      <div role="status" className="px-4 sm:px-6">
        {noMatches && (
          <p className="mb-4 flex items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
            <SearchX aria-hidden className="size-4 shrink-0" />
            No Tasks match. Try other words, or fewer Labels.
          </p>
        )}
      </div>
      <DraggableBoard
        statuses={board.statuses}
        aria-label="Board"
        role="region"
        // Dims while a Label Filter change loads: the ChipGroup's data-pending,
        // scoped to the filter bar so a pending Priority or move dims nothing.
        className="transition-opacity group-has-[[data-board-filters]_[data-pending]]/board:opacity-50"
      />
    </>
  );
}

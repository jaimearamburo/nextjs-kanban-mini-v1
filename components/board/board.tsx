import { getBoard } from "@/lib/board";
import { DraggableBoard } from "./draggable-board";

export async function Board({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  // Read per request, never baked into the prerendered shell (see getBoard).
  const board = await getBoard(await searchParams);
  return (
    <DraggableBoard
      statuses={board.statuses}
      aria-label="Board"
      role="region"
      // Dims while a Label Filter change loads: the ChipGroup's data-pending,
      // scoped to the filter bar so a pending Priority or move dims nothing.
      className="transition-opacity group-has-[[data-board-filters]_[data-pending]]/board:opacity-50"
    />
  );
}

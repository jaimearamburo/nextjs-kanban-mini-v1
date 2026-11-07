import { getBoard } from "@/lib/board";
import { DraggableBoard } from "./draggable-board";

export async function Board({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  // Awaiting the search params renders the Board per request from the cached
  // Board read, never baked into the prerendered shell. A shell prerender keeps
  // its own copy of the Board that updateTag doesn't reliably expire, so a
  // reload right after a write could show the old Board.
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

import { getBoard } from "@/lib/board";
import { BoardColumn } from "./board-column";
import { BoardLayout } from "./board-layout";
import { TaskCard } from "./task-card";

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
    <BoardLayout
      aria-label="Board"
      role="region"
      // Dims while a Label Filter change loads (the ChipGroup's data-pending).
      className="transition-opacity group-has-data-pending/board:opacity-50"
    >
      {board.statuses.map(({ status, tasks }) => (
        <BoardColumn
          key={status}
          status={status}
          count={
            <>
              {tasks.length}
              <span className="sr-only"> Tasks</span>
            </>
          }
        >
          {tasks.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              No Tasks
            </p>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </BoardColumn>
      ))}
    </BoardLayout>
  );
}

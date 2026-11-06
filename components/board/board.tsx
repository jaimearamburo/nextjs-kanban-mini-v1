import { getBoard } from "@/lib/board";
import { BoardColumn } from "./board-column";
import { BoardLayout } from "./board-layout";
import { TaskCard } from "./task-card";

export async function Board() {
  const board = await getBoard();
  return (
    <BoardLayout aria-label="Board" role="region">
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

import { listLabels } from "@/lib/board";
import { boardFilter } from "@/lib/board/schemas";
import { BoardFilters } from "./board-filters";

/**
 * Text search and the Label Filter, showing the filter in the URL. It's read
 * on the server, so the selection stays put while a Task is open over the
 * Board, even though the URL then names the Task.
 */
export async function BoardToolbar({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const [labels, filter] = await Promise.all([
    listLabels(),
    searchParams.then((params) => boardFilter.parse(params)),
  ]);
  return (
    <BoardToolbarLayout>
      <BoardFilters labels={labels} selected={filter.labels} q={filter.q} />
    </BoardToolbarLayout>
  );
}

export function BoardToolbarLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-board-filters: the Board dims while a control in here is pending.
    <div
      data-board-filters
      className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6"
    >
      {children}
    </div>
  );
}

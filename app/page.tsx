import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { Board } from "@/components/board/board";
import { BoardSkeleton } from "@/components/board/board-skeleton";
import { BoardToolbar } from "@/components/board/board-toolbar";
import { BoardToolbarSkeleton } from "@/components/board/board-toolbar-skeleton";

export default function BoardPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <AppHeader />
      {/* group/board: the Board dims while the Label Filter is pending. */}
      <main className="group/board flex flex-1 flex-col">
        <div className="px-4 pt-5 pb-4 sm:px-6">
          <h1 className="text-xl font-semibold tracking-tight">Board</h1>
        </div>
        <Suspense fallback={<BoardToolbarSkeleton />}>
          <BoardToolbar searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<BoardSkeleton />}>
          <Board searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

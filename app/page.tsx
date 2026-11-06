import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { Board } from "@/components/board/board";
import { BoardSkeleton } from "@/components/board/board-skeleton";

export default function BoardPage() {
  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col">
        <div className="px-4 pt-5 pb-4 sm:px-6">
          <h1 className="text-xl font-semibold tracking-tight">Board</h1>
        </div>
        <Suspense fallback={<BoardSkeleton />}>
          <Board />
        </Suspense>
      </main>
    </>
  );
}

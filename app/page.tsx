import { Suspense } from "react";
import { Board } from "@/components/board/board";
import { BoardSkeleton } from "@/components/board/board-skeleton";
import { CurrentGuest } from "@/components/guest/current-guest";
import { GuestSkeleton } from "@/components/guest/guest-skeleton";

export default function BoardPage() {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <div
          aria-hidden
          className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
        >
          KM
        </div>
        <p className="text-sm font-semibold">Kanban Mini</p>
        <div className="ml-auto">
          <Suspense fallback={<GuestSkeleton />}>
            <CurrentGuest />
          </Suspense>
        </div>
      </header>
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

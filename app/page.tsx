import { Suspense } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Board } from "@/components/board/board";
import { BOARD_WIDTH } from "@/components/board/board-layout";
import { BoardSkeleton } from "@/components/board/board-skeleton";
import { BoardToolbar } from "@/components/board/board-toolbar";
import { BoardToolbarSkeleton } from "@/components/board/board-toolbar-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function BoardPage({ searchParams }: PageProps<"/">) {
  return (
    // group/board: the Board dims while the Label Filter is pending.
    <main className="group/board flex flex-1 flex-col">
      <div className="px-4 pt-5 pb-4 sm:px-6">
        {/* Capped at the Board's width, so Create sits above the Done column;
            on narrower screens, where the Board scrolls, at the right edge. */}
        <div className={cn("flex items-center justify-between gap-3", BOARD_WIDTH)}>
          <h1 className="text-xl font-semibold tracking-tight">Board</h1>
          <Link href="/tasks/new" className={buttonVariants({ className: "rounded-sm px-3" })}>
            <PlusIcon aria-hidden />
            Create
            <span className="sr-only"> a Task</span>
          </Link>
        </div>
      </div>
      <Suspense fallback={<BoardToolbarSkeleton />}>
        <BoardToolbar searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<BoardSkeleton />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

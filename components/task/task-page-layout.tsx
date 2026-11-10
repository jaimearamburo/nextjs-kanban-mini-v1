import type { ReactNode } from "react";
import { BackToBoard } from "./back-to-board";

/** A full Task page: the Task in a readable column, under the layout's header. */
export function TaskPageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <BackToBoard />
      {children}
    </main>
  );
}

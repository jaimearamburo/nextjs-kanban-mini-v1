import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { BackToBoard } from "./back-to-board";

/** A full Task page: the app header, then the Task in a readable column. */
export function TaskPageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <BackToBoard />
        {children}
      </main>
    </>
  );
}

"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * The Task detail as a modal over the Board. Esc and a backdrop click go back
 * in history, so the Board reappears as it was; the browser's back button
 * does the same on its own.
 */
export function TaskModal({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto p-6 sm:max-w-2xl">
        {children}
      </DialogContent>
    </Dialog>
  );
}

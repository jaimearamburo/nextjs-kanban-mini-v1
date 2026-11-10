"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The Task detail as a side panel over the Board, as in GitHub Projects: it
 * slides in from the right below the header, covers three quarters of the
 * width up to a readable 48rem and scrolls on its own. On phones it's a
 * full-screen sheet over the header too: iOS ignores the page's scroll
 * lock, so an uncovered header could be dragged to scroll the Board behind. Esc, a click outside or the close button go back in history, so the
 * Board reappears as it was; the browser's back button does the same on its
 * own.
 */
export function TaskModal({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <DialogPrimitive.Portal>
        {/* From sm, top-14 sits below the h-14 AppHeader, leaving it
            uncovered. A very light blur sets the Board back without hiding it. */}
        <DialogPrimitive.Backdrop className="fixed inset-x-0 top-0 bottom-0 sm:top-14 z-40 bg-black/10 backdrop-blur-[2px] transition-opacity duration-150 data-starting-style:opacity-0 dark:bg-black/30" />
        <DialogPrimitive.Popup className="fixed top-0 right-0 bottom-0 sm:top-14 z-50 w-full overflow-y-auto overscroll-contain bg-background sm:border-l p-6 text-sm shadow-xl outline-none transition-transform duration-200 ease-out data-starting-style:translate-x-full sm:w-3/4 sm:max-w-3xl sm:p-8">
          {children}
          <DialogPrimitive.Close
            render={<Button variant="ghost" size="icon-sm" className="absolute top-4 right-4" />}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The width of the four columns: BoardColumn's w-70 each, with this
 * layout's gap-3 between them. Content above the Board caps itself at this,
 * so its right edge lines up with the Done column's.
 */
export const BOARD_WIDTH = "max-w-[calc(var(--spacing)*70*4+var(--spacing)*3*3)]";

/**
 * Columns side by side, scrolling horizontally when they don't fit. On touch
 * screens a sideways scroll snaps to a column, except while `dragging`.
 */
export function BoardLayout({
  children,
  className,
  dragging = false,
  ...props
}: { children: ReactNode; dragging?: boolean } & React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        // relative: absolutely positioned bits inside, like the sr-only
        // counts, are clipped here instead of widening the page.
        "relative flex flex-1 items-start gap-3 overflow-x-auto scroll-px-4 px-4 pb-6 sm:scroll-px-6 sm:px-6",
        // Snap fights dnd-kit's auto-scroll, jumping whole columns at a time,
        // so it's touch only (mouse users drag on wide screens) and off
        // while a card is dragged.
        !dragging && "pointer-coarse:snap-x pointer-coarse:snap-mandatory",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

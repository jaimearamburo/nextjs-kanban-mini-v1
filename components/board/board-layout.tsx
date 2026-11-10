import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The width of the four columns: BoardColumn's w-70 each, with this
 * layout's gap-3 between them. Content above the Board caps itself at this,
 * so its right edge lines up with the Done column's.
 */
export const BOARD_WIDTH = "max-w-[calc(var(--spacing)*70*4+var(--spacing)*3*3)]";

/** Columns side by side, scrolling horizontally when they don't fit. */
export function BoardLayout({
  children,
  className,
  ...props
}: { children: ReactNode } & React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-1 items-start gap-3 overflow-x-auto px-4 pb-6 sm:px-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

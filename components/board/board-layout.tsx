import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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

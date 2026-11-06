import type { ReactNode } from "react";

/** Columns side by side, scrolling horizontally when they don't fit. */
export function BoardLayout({
  children,
  ...props
}: { children: ReactNode } & React.ComponentProps<"div">) {
  return (
    <div
      className="flex flex-1 items-start gap-3 overflow-x-auto px-4 pb-6 sm:px-6"
      {...props}
    >
      {children}
    </div>
  );
}

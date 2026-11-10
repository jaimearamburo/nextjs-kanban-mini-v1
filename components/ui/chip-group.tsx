"use client";

import { useOptimistic, useTransition, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Chip = {
  value: string;
  label: ReactNode;
  /** Classes for the chip while selected. Defaults to the primary colour. */
  selectedClassName?: string;
};

/**
 * Toggleable chips where any number can be selected. A click shows the new
 * selection on the current frame and calls `changeAction` with it, in item
 * order, inside a transition this component owns. While that transition runs
 * the root carries `data-pending`, so ancestors can style against it (for
 * example `group-has-data-pending:opacity-50`).
 */
export function ChipGroup({
  items,
  value,
  changeAction,
  className,
  ...props
}: {
  items: Chip[];
  value: string[];
  changeAction: (value: string[]) => void | Promise<void>;
} & Omit<React.ComponentProps<"div">, "onChange">) {
  const [optimisticValue, setOptimisticValue] = useOptimistic(value);
  const [isPending, startTransition] = useTransition();

  function toggle(chip: string) {
    // Read from the optimistic value, so rapid clicks build on what's shown.
    const selected = new Set(optimisticValue);
    if (selected.has(chip)) selected.delete(chip);
    else selected.add(chip);
    const next = items.map((item) => item.value).filter((v) => selected.has(v));
    startTransition(async () => {
      setOptimisticValue(next);
      await changeAction(next);
    });
  }

  return (
    <div
      role="group"
      data-pending={isPending || undefined}
      className={cn("flex flex-wrap gap-1.5", className)}
      {...props}
    >
      {items.map((item) => {
        const selected = optimisticValue.includes(item.value);
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(item.value)}
            className={cn(
              "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium ring-1 transition-colors outline-none ring-inset focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-10 pointer-coarse:px-4 pointer-coarse:text-sm",
              selected
                ? (item.selectedClassName ??
                    "bg-primary text-primary-foreground ring-primary")
                : "bg-background text-muted-foreground ring-border hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

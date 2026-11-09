"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import type { WriteResult } from "@/lib/board/domain";

/**
 * One Task field as a select: a change shows instantly and `changeAction`
 * gets the final value. If it fails, only this field rolls back, with a toast.
 */
export function FieldSelect<T extends string>({
  name,
  value,
  options,
  changeAction,
}: {
  name: string;
  value: T;
  options: { value: T; name: string }[];
  changeAction: (value: T) => Promise<WriteResult>;
}) {
  const [optimisticValue, setOptimisticValue] = useOptimistic(value);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: T) {
    startTransition(async () => {
      setOptimisticValue(next);
      const result = await changeAction(next);
      if (!result.ok) {
        toast.error(`Couldn't change the ${name}`, { description: result.error });
      }
    });
  }

  return (
    <select
      aria-label={name}
      value={optimisticValue}
      onChange={(event) => handleChange(event.target.value as T)}
      data-pending={isPending || undefined}
      className="h-8 cursor-pointer rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-pending:animate-pulse"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.name}
        </option>
      ))}
    </select>
  );
}

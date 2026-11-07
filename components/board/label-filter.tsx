"use client";

import { ChipGroup } from "@/components/ui/chip-group";
import type { Label } from "@/lib/board/domain";
import { cn } from "@/lib/utils";
import type { BoardUrl } from "./board-url";
import { labelColorClass, labelDotClass } from "./colors";

/**
 * The Label Filter: one pill per Label. Each change pushes a history entry
 * (`?labels=`), so filtered views can be shared and the back button steps
 * through them. `selected` comes from the server's render of the URL.
 */
export function LabelFilter({
  labels,
  selected,
  boardUrl,
}: {
  labels: Label[];
  selected: string[];
  boardUrl: BoardUrl;
}) {
  function filterAction(ids: string[]) {
    boardUrl.set("labels", ids.length > 0 ? ids.join(",") : null, "push");
  }

  return (
    <ChipGroup
      aria-label="Filter by Label"
      items={labels.map((label) => ({
        value: label.id,
        label: (
          <>
            <span
              aria-hidden
              className={cn("size-1.5 rounded-full", labelDotClass(label.color))}
            />
            {label.name}
          </>
        ),
        selectedClassName: labelColorClass(label.color),
      }))}
      value={selected}
      changeAction={filterAction}
    />
  );
}

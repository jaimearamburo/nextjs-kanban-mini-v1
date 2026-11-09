"use client";

import { labelColorClass } from "@/components/board/colors";
import { ChipGroup } from "@/components/ui/chip-group";
import type { Label, WriteResult } from "@/lib/board/domain";
import { toast } from "sonner";

/** A Task's Labels as toggles. A failed save rolls them back, with a toast. */
export function LabelPicker({
  labels,
  selected,
  changeAction,
}: {
  labels: Label[];
  selected: string[];
  changeAction: (labelIds: string[]) => Promise<WriteResult>;
}) {
  return (
    <ChipGroup
      aria-label="Labels"
      items={labels.map((label) => ({
        value: label.id,
        label: label.name,
        selectedClassName: labelColorClass(label.color),
      }))}
      value={selected}
      changeAction={async (labelIds) => {
        const result = await changeAction(labelIds);
        if (!result.ok) {
          toast.error("Couldn't change the Labels", { description: result.error });
        }
      }}
    />
  );
}

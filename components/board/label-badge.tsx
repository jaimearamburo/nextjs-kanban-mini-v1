import type { Label } from "@/lib/board/domain";
import { cn } from "@/lib/utils";
import { labelColorClass } from "./colors";

export function LabelBadge({ label }: { label: Label }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded px-1.5 text-[11px] font-semibold tracking-wide uppercase ring-1 ring-inset",
        labelColorClass(label.color),
      )}
    >
      {label.name}
    </span>
  );
}

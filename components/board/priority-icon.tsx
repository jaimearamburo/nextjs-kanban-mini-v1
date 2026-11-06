import { ChevronDown, ChevronUp, ChevronsUp, Equal } from "lucide-react";
import { PRIORITY_NAMES, type Priority } from "@/lib/board/domain";
import { cn } from "@/lib/utils";

const icons = {
  LOW: { Icon: ChevronDown, className: "text-sky-600 dark:text-sky-400" },
  MEDIUM: { Icon: Equal, className: "text-amber-600 dark:text-amber-400" },
  HIGH: { Icon: ChevronUp, className: "text-orange-600 dark:text-orange-400" },
  URGENT: { Icon: ChevronsUp, className: "text-red-600 dark:text-red-400" },
} as const;

/** Jira-style priority glyph. Priority None shows nothing, to keep cards clean. */
export function PriorityIcon({ priority }: { priority: Priority }) {
  if (priority === "NONE") return null;
  const { Icon, className } = icons[priority];
  const label = `Priority: ${PRIORITY_NAMES[priority]}`;
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex">
      <Icon className={cn("size-4", className)} strokeWidth={2.5} aria-hidden />
    </span>
  );
}

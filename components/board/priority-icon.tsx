import { ChevronDown, ChevronUp, ChevronsUp, Equal, Minus } from "lucide-react";
import type { Priority } from "@/lib/board/domain";
import { cn } from "@/lib/utils";

const icons = {
  NONE: { Icon: Minus, className: "text-muted-foreground" },
  LOW: { Icon: ChevronDown, className: "text-sky-600 dark:text-sky-400" },
  MEDIUM: { Icon: Equal, className: "text-amber-600 dark:text-amber-400" },
  HIGH: { Icon: ChevronUp, className: "text-orange-600 dark:text-orange-400" },
  URGENT: { Icon: ChevronsUp, className: "text-red-600 dark:text-red-400" },
} as const;

/** Jira-style priority glyph, decorative: its control carries the name. */
export function PriorityIcon({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const { Icon, className: color } = icons[priority];
  return (
    <Icon className={cn("size-4", color, className)} strokeWidth={2.5} aria-hidden />
  );
}

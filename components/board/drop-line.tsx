import { cn } from "@/lib/utils";

/** The edge of a card, or a column's list, that a drop line is drawn on. */
export type DropEdge = "top" | "bottom";

/**
 * The Jira-style drop line (ADR-0003): a thin accent line with a leading dot,
 * centred in the gap on one edge of the card, or the column's list, it sits in.
 * The parent must be positioned. Cards never shift to make room.
 */
export function DropLine({ edge }: { edge: DropEdge }) {
  return (
    <div
      aria-hidden
      data-drop-line={edge}
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400",
        // Half the 8px gap between cards, less half the line.
        edge === "top" ? "-top-[5px]" : "-bottom-[5px]",
      )}
    >
      <span className="absolute top-1/2 -left-1.5 size-2 -translate-y-1/2 rounded-full border-2 border-blue-600 bg-background dark:border-blue-400" />
    </div>
  );
}

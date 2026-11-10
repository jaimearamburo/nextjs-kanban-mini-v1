import { Skeleton } from "@/components/ui/skeleton";
import { BoardToolbarLayout } from "./board-toolbar";

/**
 * Each Label Filter pill's width in px, with a mouse and on touch, where the
 * pills are bigger (Frontend, Backend, Bug, Design, Docs, Infra). Matching
 * them keeps the pills wrapping onto the same rows as the real ones, so the
 * Board doesn't shift when the toolbar streams in.
 */
const PILL_WIDTHS = [
  { fine: 89, coarse: 104 },
  { fine: 85, coarse: 101 },
  { fine: 57, coarse: 68 },
  { fine: 76, coarse: 91 },
  { fine: 66, coarse: 77 },
  { fine: 61, coarse: 73 },
];

/** Shown in the static shell while the search params are read. Sized like the real toolbar. */
export function BoardToolbarSkeleton() {
  return (
    <BoardToolbarLayout>
      <Skeleton className="h-8 w-full sm:w-64 pointer-coarse:h-11" />
      <div className="flex flex-wrap gap-1.5">
        {PILL_WIDTHS.map(({ fine, coarse }, index) => (
          <Skeleton
            key={index}
            className="h-7 w-(--fine) rounded-full pointer-coarse:h-10 pointer-coarse:w-(--coarse)"
            style={{ "--fine": `${fine}px`, "--coarse": `${coarse}px` } as React.CSSProperties}
          />
        ))}
      </div>
    </BoardToolbarLayout>
  );
}

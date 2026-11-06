import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Leaves a full Task page for the Board. */
export function BackToBoard() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Back to the Board
    </Link>
  );
}

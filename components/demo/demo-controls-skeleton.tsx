import { Skeleton } from "@/components/ui/skeleton";

/** Stands in for the demo controls button in the static shell. */
export function DemoControlsSkeleton() {
  return <Skeleton aria-hidden className="h-7 w-8 sm:w-32" />;
}

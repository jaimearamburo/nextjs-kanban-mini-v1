import { Skeleton } from "@/components/ui/skeleton";

/** Stands in for the Guest in the static shell and while one is created. */
export function GuestSkeleton() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="size-8 rounded-full" />
    </div>
  );
}

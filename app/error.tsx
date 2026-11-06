"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Catches unexpected errors on the Board and lets the Guest try again. */
export default function BoardError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div
        role="alert"
        className="flex max-w-sm flex-col items-center gap-3 text-center"
      >
        <TriangleAlert className="size-8 text-destructive" aria-hidden />
        <h1 className="text-base font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          The Board couldn&apos;t be loaded. This is usually temporary.
        </p>
        <Button onClick={() => retry()}>Try again</Button>
      </div>
    </main>
  );
}

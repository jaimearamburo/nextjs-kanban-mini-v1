"use client";

import { catchError, type ErrorInfo } from "next/error";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Catches a failure to load a Task's Comments, so the rest of its detail
 * stays usable, and lets the Guest try again.
 */
function CommentsError(_props: object, { retry }: ErrorInfo) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <TriangleAlert aria-hidden className="size-4 shrink-0 text-destructive" />
      The Comments couldn&apos;t be loaded.
      <Button variant="outline" size="sm" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}

export const CommentsErrorBoundary = catchError(CommentsError);

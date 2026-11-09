"use client";

import { useOptimistic } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { WriteResult } from "@/lib/board/domain";

/** Its `data-pending` lets the Comment around it fade out with `has-data-pending:`. */
export function DeleteCommentButton({
  deleteAction,
}: {
  deleteAction: () => Promise<WriteResult>;
}) {
  const [isDeleting, setIsDeleting] = useOptimistic(false);

  return (
    <form
      className="ml-auto"
      action={async () => {
        setIsDeleting(true);
        const result = await deleteAction();
        if (!result.ok) toast.error("Couldn't delete the Comment", { description: result.error });
      }}
    >
      <Button
        type="submit"
        variant="ghost"
        size="icon-xs"
        aria-label="Delete Comment"
        disabled={isDeleting}
        data-pending={isDeleting || undefined}
        className="text-muted-foreground"
      >
        <Trash2 />
      </Button>
    </form>
  );
}

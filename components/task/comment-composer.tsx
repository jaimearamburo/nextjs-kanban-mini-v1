"use client";

import { useOptimistic, useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { COMMENT_MAX_LENGTH, type CommentAuthor, type WriteResult } from "@/lib/board/domain";
import { CommentContent } from "./comment-content";

type PendingComment = { key: number; body: string };

/** Stands in for a first-time visitor, whose Guest the Server Action creates. */
const YOU: CommentAuthor = { id: "you", name: "You", color: "slate" };

/**
 * The box to add a Comment, and the Comments still being added. The optimistic
 * list holds only those, because the saved ones arrive with the action's
 * refresh. A failed add puts its text back, unless the Guest has started another.
 */
export function CommentComposer({
  guest,
  addAction,
}: {
  guest: CommentAuthor | null;
  addAction: (body: string) => Promise<WriteResult>;
}) {
  const [body, setBody] = useState("");
  const [pending, addPending] = useOptimistic<PendingComment[], PendingComment>(
    [],
    (current, comment) => [...current, comment],
  );
  const [, startTransition] = useTransition();
  const nextKey = useRef(0);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody("");
    const key = nextKey.current++;
    startTransition(async () => {
      addPending({ key, body: text });
      const result = await addAction(text);
      if (!result.ok) {
        toast.error("Couldn't add the Comment", { description: result.error });
        setBody((current) => (current === "" ? text : current));
      }
    });
  }

  return (
    <>
      {pending.length > 0 && (
        <ul className="flex flex-col gap-3">
          {pending.map((comment) => (
            <li key={comment.key} data-pending className="flex animate-pulse gap-2 opacity-60">
              <CommentContent author={guest ?? YOU} time="just now" body={comment.body} />
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col items-end gap-2">
        <textarea
          aria-label="Add a Comment"
          placeholder="Add a Comment…"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={COMMENT_MAX_LENGTH}
          rows={2}
          className="w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 pointer-coarse:text-lg"
        />
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          disabled={body.trim() === ""}
          className="rounded-sm px-4"
        >
          Comment
        </Button>
      </form>
    </>
  );
}

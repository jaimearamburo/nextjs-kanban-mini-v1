import { Skeleton } from "@/components/ui/skeleton";
import { listComments } from "@/lib/board";
import { addTaskComment, archiveTaskComment } from "@/lib/board/actions";
import { getCurrentGuest } from "@/lib/guests";
import { CommentComposer } from "./comment-composer";
import { CommentContent } from "./comment-content";
import { DeleteCommentButton } from "./delete-comment-button";

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
] as const;

/** "just now", "5 minutes ago", "yesterday". */
function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  for (const [unit, size] of UNITS) {
    if (seconds >= size) return relativeTime.format(-Math.floor(seconds / size), unit);
  }
  return "just now";
}

/**
 * A Task's Comments, read per request. Streams in through Suspense. The list
 * is server-rendered; only the composer and the Delete buttons are client code.
 */
export async function Comments({ taskId }: { taskId: string }) {
  const [comments, guest] = await Promise.all([listComments(taskId), getCurrentGuest()]);
  return (
    <div className="group/comments flex flex-col gap-3">
      {comments.length === 0 ? (
        // Hidden while the first Comment is pending.
        <p className="text-sm text-muted-foreground group-has-data-pending/comments:hidden">
          No Comments yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="flex gap-2 transition-opacity duration-300 has-data-pending:pointer-events-none has-data-pending:opacity-0"
            >
              <CommentContent
                author={comment.author}
                time={timeAgo(comment.createdAt)}
                body={comment.body}
              >
                <DeleteCommentButton deleteAction={archiveTaskComment.bind(null, comment.id)} />
              </CommentContent>
            </li>
          ))}
        </ul>
      )}
      <CommentComposer guest={guest} addAction={addTaskComment.bind(null, taskId)} />
    </div>
  );
}

export function CommentsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading Comments" className="flex flex-col gap-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

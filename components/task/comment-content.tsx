import type { ReactNode } from "react";
import { GuestAvatar } from "@/components/guest/guest-avatar";
import type { CommentAuthor } from "@/lib/board/domain";

/**
 * A Comment's avatar, author, time and body, for saved and pending Comments
 * alike. The header row's fixed height holds the Delete button (`children`),
 * so a pending Comment doesn't shift when it is confirmed and gains one.
 */
export function CommentContent({
  author,
  time,
  body,
  children,
}: {
  author: CommentAuthor;
  time: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <>
      <GuestAvatar guest={author} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex h-6 items-center gap-2 text-xs">
          <span className="font-medium">{author.name}</span>
          <span className="text-muted-foreground">{time}</span>
          {children}
        </div>
        <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">{body}</p>
      </div>
    </>
  );
}

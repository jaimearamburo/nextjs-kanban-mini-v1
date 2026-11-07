"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";
import { boardFilter } from "@/lib/board/schemas";
import type { BoardUrl } from "./board-url";

/** A search as the server reads it (trimmed). */
function normalise(q: string | null) {
  return boardFilter.parse({ q: q ?? undefined }).q;
}

/**
 * Text search over Task titles and descriptions, kept in `?q=` alongside the
 * Label Filter. Typing replaces the current history entry rather than adding
 * one. The input renders the typed text on every keystroke; the URL follows a
 * deferred copy, so slow Board renders never hold the input back.
 */
export function TaskSearch({ q, boardUrl }: { q: string; boardUrl: BoardUrl }) {
  const [query, setQuery] = useState(q);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const next = normalise(deferredQuery);
    if (next === normalise(boardUrl.get("q"))) return;
    boardUrl.set("q", next || null, "replace");
  }, [deferredQuery, boardUrl]);

  // Back and forward restore an older `q`; show it in the input.
  useEffect(() => {
    const restore = () =>
      setQuery(normalise(new URLSearchParams(window.location.search).get("q")));
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  return (
    <div className="relative w-full sm:w-64">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        aria-label="Search Tasks"
        placeholder="Search Tasks"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-8 w-full rounded-md border border-input bg-background pr-2.5 pl-8 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      />
    </div>
  );
}

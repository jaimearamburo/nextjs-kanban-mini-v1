import { useEffect, useMemo, useRef } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

/** The Board's search params as last navigated to, and a way to change one. */
export type BoardUrl = {
  get(name: string): string | null;
  /** Sets (or, given null, removes) one search param, keeping the others. */
  set(name: string, value: string | null, history: "push" | "replace"): void;
};

/**
 * The Board URL, shared by the Label Filter and search. It tracks the URL as
 * last navigated to, which runs ahead of `window.location` while a navigation
 * is in flight, so a pill click and typing never undo each other's change.
 * Back and forward hand control back to the browser's URL.
 */
export function useBoardUrl(): BoardUrl {
  const router = useRouter();
  const latest = useRef<URLSearchParams | null>(null);

  useEffect(() => {
    const forget = () => {
      latest.current = null;
    };
    window.addEventListener("popstate", forget);
    return () => window.removeEventListener("popstate", forget);
  }, []);

  return useMemo(() => {
    const current = () =>
      new URLSearchParams(latest.current ?? window.location.search);
    return {
      get: (name) => current().get(name),
      set(name, value, history) {
        const params = current();
        if (value) params.set(name, value);
        else params.delete(name);
        latest.current = params;
        const url = boardUrl(params);
        if (history === "push") router.push(url, { scroll: false });
        else router.replace(url, { scroll: false });
      },
    };
  }, [router]);
}

function boardUrl(params: URLSearchParams): Route {
  // Commas are safe in a query string; leaving them unencoded keeps shared
  // links readable (`?labels=bug,frontend`).
  const query = params.toString().replaceAll("%2C", ",");
  return (query ? `/?${query}` : "/") as Route;
}

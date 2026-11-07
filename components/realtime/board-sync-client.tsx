"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Realtime } from "ably";
import { CHANGE_EVENT, receivedChange } from "@/lib/realtime/events";
import { boardRefreshes, setBoardRefresh } from "./board-refresh";

/** Fetches a token request for this Guest from the token Route Handler. */
async function fetchToken() {
  const response = await fetch("/api/realtime/token", { cache: "no-store" });
  if (!response.ok) throw new Error(`Token request failed (${response.status}).`);
  return response.json();
}

/**
 * Listens on the Board channel and answers each change from another tab with
 * a soft refresh, `startTransition(() => router.refresh())`, which keeps
 * scroll, the open modal, typed text and client state, and shows no Suspense
 * fallbacks (ADR-0005). Renders nothing.
 */
export function BoardSyncClient({ channel }: { channel: string }) {
  const router = useRouter();

  useEffect(() => {
    const scheduler = boardRefreshes();
    setBoardRefresh(() => startTransition(() => router.refresh()));
    let realtime: Realtime | null = null;
    let stopped = false;

    // Loaded on demand, so the Ably client stays out of the initial bundle.
    import("ably").then((Ably) => {
      if (stopped) return;
      realtime = new Ably.Realtime({
        authCallback: (_params, callback) => {
          fetchToken().then(
            (token) => callback(null, token),
            (error: Error) => callback(error.message, null),
          );
        },
      });
      const boardChannel = realtime.channels.get(channel);
      let attached = false;
      // After a reconnect that lost the channel's continuity, events may
      // have been missed, so catch up with one refresh.
      boardChannel.on("attached", (change) => {
        if (attached && !change.resumed) scheduler.invalidate();
        attached = true;
      });
      boardChannel.subscribe(CHANGE_EVENT, (message) => {
        const parsed = receivedChange.safeParse(message.data);
        if (parsed.success) scheduler.receive(parsed.data);
      });
    });

    return () => {
      stopped = true;
      realtime?.close();
      setBoardRefresh(null);
    };
  }, [channel, router]);

  return null;
}

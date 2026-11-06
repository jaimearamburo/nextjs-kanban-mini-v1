"use client";

import { useEffect, useRef, useTransition } from "react";
import { startGuestSession } from "@/lib/guests/actions";
import { GuestSkeleton } from "./guest-skeleton";

/**
 * Shown when the visitor has no valid Guest. Cookies can only be set from a
 * Server Action, so the Guest is created right after the page loads; setting
 * the cookie re-renders the page with the new Guest.
 */
export function StartGuestSession() {
  const [, startTransition] = useTransition();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startTransition(() => startGuestSession());
  }, []);

  return <GuestSkeleton />;
}

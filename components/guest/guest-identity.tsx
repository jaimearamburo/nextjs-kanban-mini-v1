"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { Guest } from "@/lib/guests";
import { rerollGuest } from "@/lib/guests/actions";
import { cn } from "@/lib/utils";
import { GuestAvatar } from "./guest-avatar";

/** The visitor's Guest in the header, with the "new identity" re-roll. */
export function GuestIdentity({ guest }: { guest: Guest }) {
  return (
    <form action={rerollGuest} className="flex items-center gap-1.5">
      <div
        role="group"
        aria-label={`You are ${guest.name}`}
        className="flex items-center gap-2"
      >
        <span className="max-w-40 truncate text-sm font-medium">{guest.name}</span>
        <GuestAvatar guest={guest} />
      </div>
      <RerollButton />
    </form>
  );
}

function RerollButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      aria-label="New identity"
      title="New identity"
      disabled={pending}
    >
      <span
        aria-hidden
        className={cn("text-lg leading-none", pending && "animate-spin")}
      >
        🎲
      </span>
    </Button>
  );
}

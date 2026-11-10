"use client";

import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Guest } from "@/lib/guests";
import { rerollGuest } from "@/lib/guests/actions";
import { cn } from "@/lib/utils";
import { GuestAvatar } from "./guest-avatar";

/** The visitor's Guest in the header, with the "new identity" re-roll. */
export function GuestIdentity({ guest }: { guest: Guest }) {
  async function reroll() {
    const result = await rerollGuest();
    if (!result.ok) {
      toast.error("Couldn't get a new identity", { description: result.error });
    }
  }

  return (
    <form action={reroll} className="flex items-center gap-1.5">
      <div
        role="group"
        aria-label={`You are ${guest.name}`}
        className="flex items-center gap-2"
      >
        <span className="max-w-40 truncate text-sm font-medium max-sm:sr-only">{guest.name}</span>
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

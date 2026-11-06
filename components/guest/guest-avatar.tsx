import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatarColorClass } from "@/components/board/colors";
import { initials } from "@/components/board/initials";
import type { Guest } from "@/lib/guests";
import { cn } from "@/lib/utils";

export function GuestAvatar({ guest }: { guest: Guest }) {
  return (
    <Avatar aria-hidden>
      <AvatarFallback
        className={cn("text-xs font-semibold", avatarColorClass(guest.color))}
      >
        {initials(guest.name)}
      </AvatarFallback>
    </Avatar>
  );
}

import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { TeamMember } from "@/lib/board/domain";
import { cn } from "@/lib/utils";
import { avatarColorClass } from "./colors";
import { initials } from "./initials";

export function AssigneeAvatar({ assignee }: { assignee: TeamMember | null }) {
  const label = assignee ? `Assignee: ${assignee.name}` : "Unassigned";
  return (
    <Avatar size="sm" role="img" aria-label={label} title={label}>
      <AvatarFallback
        className={cn(
          "text-[10px] font-semibold",
          assignee
            ? avatarColorClass(assignee.color)
            : "bg-muted text-muted-foreground",
        )}
      >
        {assignee ? initials(assignee.name) : <UserRound className="size-3.5" />}
      </AvatarFallback>
    </Avatar>
  );
}

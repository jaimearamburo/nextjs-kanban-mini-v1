import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { TeamMember } from "@/lib/board/domain";
import { cn } from "@/lib/utils";
import { avatarColorClass } from "./colors";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

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

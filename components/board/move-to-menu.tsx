"use client";

import { Menu } from "@base-ui/react/menu";
import { EllipsisVerticalIcon } from "lucide-react";
import { STATUSES, STATUS_NAMES, type Status } from "@/lib/board/domain";

/**
 * A card's "Move to…" menu, for changing its Status on touch screens without
 * a long-press drag across the columns (ADR-0003). It lists the other
 * Statuses; mouse users drag instead, so it's hidden for them.
 */
export function MoveToMenu({
  status,
  moveAction,
}: {
  status: Status;
  moveAction: (status: Status) => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Move to…"
        // A 40px tap target that doesn't make the card taller.
        className="-mt-2.5 -mr-2.5 hidden size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent pointer-coarse:inline-flex"
      >
        <EllipsisVerticalIcon aria-hidden className="size-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4} className="isolate z-50">
          <Menu.Popup
            // React passes the portaled menu's events up to the card, whose
            // mousedown would start a drag and swallow the item's click.
            onMouseDown={(event) => event.stopPropagation()}
            className="min-w-44 origin-(--transform-origin) rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
            <Menu.Group>
              <Menu.GroupLabel className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                Move to
              </Menu.GroupLabel>
              {STATUSES.filter((other) => other !== status).map((other) => (
                <Menu.Item
                  key={other}
                  onClick={() => moveAction(other)}
                  className="flex h-11 cursor-pointer items-center rounded-md px-3 text-base outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  {STATUS_NAMES[other]}
                </Menu.Item>
              ))}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

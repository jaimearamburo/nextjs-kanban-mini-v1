import type { BoardTask, Status } from "@/lib/board/domain";
import type { MoveTaskInput } from "@/lib/board/schemas";

/**
 * A card on the client Board: `moving` while its move is unconfirmed,
 * `creating` while it's a Task the server hasn't saved yet.
 */
export type ClientTask = BoardTask & { moving?: boolean; creating?: boolean };

/** One Status and its cards, as the client Board shows them. */
export type ClientStatusTasks = { status: Status; tasks: ClientTask[] };

/**
 * A drop position: a Status and a slot among its cards, not counting the
 * card being dragged. Slot 0 is above the first card, slot n below the last.
 */
export type DropSlot = { status: Status; index: number };

/** A move as the server takes it: the target Status and the cards around the drop. */
export type Move = MoveTaskInput;

/** The Tasks in a Status, leaving out the one being dragged. */
export function otherTasks(statuses: ClientStatusTasks[], status: Status, taskId: string) {
  const column = statuses.find((column) => column.status === status);
  return (column?.tasks ?? []).filter((task) => task.id !== taskId);
}

/** Where a Task is now, as a slot; dropping it there changes nothing. */
export function currentSlot(statuses: ClientStatusTasks[], taskId: string): DropSlot | null {
  for (const { status, tasks } of statuses) {
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index !== -1) return { status, index };
  }
  return null;
}

/** Whether two slots are the same place. */
export function isSameSlot(a: DropSlot | null, b: DropSlot | null) {
  return a !== null && b !== null && a.status === b.status && a.index === b.index;
}

/** The move a drop in `slot` makes: the cards just above and below it. */
export function moveFor(statuses: ClientStatusTasks[], taskId: string, slot: DropSlot): Move {
  const others = otherTasks(statuses, slot.status, taskId);
  return {
    taskId,
    status: slot.status,
    beforeId: others[slot.index - 1]?.id ?? null,
    afterId: others[slot.index]?.id ?? null,
  };
}

/** The Board with a move applied, for the optimistic update; the card is marked moving. */
export function applyMove(statuses: ClientStatusTasks[], move: Move): ClientStatusTasks[] {
  const task = statuses.flatMap(({ tasks }) => tasks).find((task) => task.id === move.taskId);
  if (!task) return statuses;
  return statuses.map(({ status, tasks }) => {
    const rest = tasks.filter((t) => t.id !== move.taskId);
    if (status !== move.status) return { status, tasks: rest };
    const afterBefore = rest.findIndex((t) => t.id === move.beforeId) + 1;
    const atAfter = rest.findIndex((t) => t.id === move.afterId);
    // After the card above it; failing that, before the card below; else last.
    const index =
      move.beforeId !== null && afterBefore > 0
        ? afterBefore
        : atAfter !== -1
          ? atAfter
          : rest.length;
    return {
      status,
      tasks: [...rest.slice(0, index), { ...task, status, moving: true }, ...rest.slice(index)],
    };
  });
}

"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  useDraggable,
  useSensor,
  useSensors,
  type Announcements,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  memo,
  startTransition,
  useCallback,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { toast } from "sonner";
import { moveTaskBetween } from "@/lib/board/actions";
import { STATUS_NAMES, STATUSES, type BoardTask } from "@/lib/board/domain";
import { cn } from "@/lib/utils";
import { BoardColumn } from "./board-column";
import { BoardLayout } from "./board-layout";
import { DropLine, type DropEdge } from "./drop-line";
import {
  applyMove,
  currentSlot,
  isSameSlot,
  moveFor,
  otherTasks,
  type ClientStatusTasks,
  type DropSlot,
} from "./move";
import { TaskCard } from "./task-card";

type Point = { x: number; y: number };

/** Cards are shown memoised, so a drag re-renders only the cards it changes. */
const MemoTaskCard = memo(TaskCard);

/**
 * Whether a press starts on a control inside the card (the title link, the
 * Priority button). Those need a few pixels of movement before a drag starts,
 * so a click still works; anywhere else on the card a drag starts at once.
 */
function isOnControl(event: Event) {
  return event.target instanceof Element && event.target.closest("a, button") !== null;
}

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "To move a Task, press Space or Enter. Use the up and down arrow keys to move it within a Status, " +
    "and the left and right arrow keys to move it to another Status. " +
    "Press Space or Enter again to drop it, or Escape to cancel.",
};

/**
 * The slot under a point: the nearest column, then which half of which card
 * the point is over, ignoring the dragged card. Null outside the Board.
 */
function slotAt(board: HTMLElement, point: Point, activeId: string): DropSlot | null {
  const bounds = board.getBoundingClientRect();
  if (
    point.x < bounds.left ||
    point.x > bounds.right ||
    point.y < bounds.top ||
    point.y > bounds.bottom
  ) {
    return null;
  }
  const columns = [...board.querySelectorAll<HTMLElement>("section[data-status]")];
  const column = columns
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const distance = Math.max(rect.left - point.x, 0, point.x - rect.right);
      return { element, distance };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.element;
  if (!column) return null;
  const index = cardsIn(column, activeId).filter((card) => {
    const rect = card.getBoundingClientRect();
    return rect.top + rect.height / 2 < point.y;
  }).length;
  return { status: column.dataset.status as DropSlot["status"], index };
}

/** A column's cards in order, ignoring the dragged one. */
function cardsIn(column: HTMLElement, activeId: string) {
  return [...column.querySelectorAll<HTMLElement>("[data-task-id]")].filter(
    (card) => card.dataset.taskId !== activeId,
  );
}

/** A point inside `slot` that `slotAt` maps back to it: the middle of its gap. */
function pointIn(board: HTMLElement, slot: DropSlot, activeId: string): Point | null {
  const column = board.querySelector<HTMLElement>(`section[data-status="${slot.status}"]`);
  const list = column?.querySelector<HTMLElement>("[data-column-tasks]");
  if (!column || !list) return null;
  const rect = column.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const cards = cardsIn(column, activeId);
  if (cards.length === 0) return { x, y: list.getBoundingClientRect().top + 4 };
  return slot.index < cards.length
    ? { x, y: cards[slot.index].getBoundingClientRect().top - 4 }
    : { x, y: cards[cards.length - 1].getBoundingClientRect().bottom + 4 };
}

/**
 * The Board's columns with drag and drop (ADR-0003). A drop shows a
 * Jira-style line where the card will land, and applies optimistically: the
 * card moves at once and rolls back with a toast if the server refuses.
 */
export function DraggableBoard({
  statuses,
  ...props
}: { statuses: ClientStatusTasks[] } & Omit<ComponentProps<typeof BoardLayout>, "children">) {
  const [optimisticStatuses, applyOptimisticMove] = useOptimistic(statuses, applyMove);
  const boardRef = useRef<HTMLDivElement>(null);
  // The dragged card, set once it has actually moved: the overlay and the
  // faded original appear on the first pixel, never for a plain click.
  const [active, setActive] = useState<BoardTask | null>(null);
  // Where the drop line shows: only where a drop would change something.
  const [shownDrop, setShownDrop] = useState<DropSlot | null>(null);
  // Read by sensors, handlers and announcements, outside render.
  const dropRef = useRef<DropSlot | null>(null);
  const originRef = useRef<DropSlot | null>(null);
  const statusesRef = useRef(optimisticStatuses);
  useLayoutEffect(() => {
    statusesRef.current = optimisticStatuses;
  }, [optimisticStatuses]);
  const pointerRef = useRef<Point | null>(null);
  const draggingRef = useRef<{ task: BoardTask; start: Point; moved: boolean } | null>(null);
  const frameRef = useRef<number | null>(null);

  const updateDrop = useCallback((slot: DropSlot | null) => {
    if (isSameSlot(slot, dropRef.current) || slot === dropRef.current) return;
    dropRef.current = slot;
    setShownDrop(isSameSlot(slot, originRef.current) ? null : slot);
  }, []);

  // Arrow keys step the drop slot, and move the dragged card to show it.
  const keyboardCoordinates = useCallback<KeyboardCoordinateGetter>(
    (event, { active, context }) => {
      const board = boardRef.current;
      const from = dropRef.current ?? originRef.current;
      if (!board || !from) return undefined;
      const activeId = String(active);
      const column = STATUSES.indexOf(from.status);
      const step: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      if (!(event.code in step)) return undefined;
      event.preventDefault();
      const [dx, dy] = step[event.code];
      const status = STATUSES[Math.min(Math.max(column + dx, 0), STATUSES.length - 1)];
      const slots = otherTasks(statusesRef.current, status, activeId).length;
      const slot = { status, index: Math.min(Math.max(from.index + dy, 0), slots) };
      updateDrop(slot);
      const point = pointIn(board, slot, activeId);
      const rect = context.collisionRect;
      if (!point || !rect) return undefined;
      return { x: point.x - rect.width / 2, y: point.y - rect.height / 2 };
    },
    [updateDrop],
  );

  // Stable options: a new object would make dnd-kit rebuild the sensors,
  // and with them every card's listeners, on each render.
  const mouseOptions = useMemo(
    () => ({
      activationConstraint: { distance: 3 },
      bypassActivationConstraint: ({ event }: { event: Event }) => !isOnControl(event),
    }),
    [],
  );
  const keyboardOptions = useMemo(
    () => ({ coordinateGetter: keyboardCoordinates }),
    [keyboardCoordinates],
  );
  const sensors = useSensors(
    // Mouse only: touch drags (long-press) are the mobile ticket's (ADR-0003).
    useSensor(MouseSensor, mouseOptions),
    useSensor(KeyboardSensor, keyboardOptions),
  );

  const titleOf = (id: string | number) =>
    statusesRef.current.flatMap(({ tasks }) => tasks).find((task) => task.id === id)?.title ??
    "the Task";

  /** Where the drop would land, in words. */
  function describeDrop(id: string | number) {
    const slot = dropRef.current;
    if (!slot || isSameSlot(slot, originRef.current)) return `${titleOf(id)} is in its original place.`;
    const count = otherTasks(statusesRef.current, slot.status, String(id)).length + 1;
    return `${titleOf(id)} is in ${STATUS_NAMES[slot.status]}, card ${slot.index + 1} of ${count}.`;
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragMove: ({ active }) => describeDrop(active.id),
    onDragOver: () => undefined,
    onDragEnd: ({ active }) => {
      const slot = dropRef.current;
      if (!slot || isSameSlot(slot, originRef.current)) return `${titleOf(active.id)} was not moved.`;
      return `Dropped ${titleOf(active.id)} in ${STATUS_NAMES[slot.status]}.`;
    },
    onDragCancel: ({ active }) => `Cancelled. ${titleOf(active.id)} was not moved.`,
  };

  // A drag that starts and ends on the title must not then follow the link.
  const preventClick = useCallback((event: MouseEvent) => event.preventDefault(), []);
  // Mouse drags work out the slot from our own mousemove listener, once a
  // frame, rather than from dnd-kit's onDragMove, which runs a render later.
  const trackPointer = useCallback(
    (event: MouseEvent) => {
      const dragging = draggingRef.current;
      if (!dragging) return;
      const point = { x: event.clientX, y: event.clientY };
      pointerRef.current = point;
      if (!dragging.moved && (point.x !== dragging.start.x || point.y !== dragging.start.y)) {
        dragging.moved = true;
        setActive(dragging.task);
      }
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        const board = boardRef.current;
        const latest = pointerRef.current;
        const current = draggingRef.current;
        if (board && latest && current) updateDrop(slotAt(board, latest, current.task.id));
      });
    },
    [updateDrop],
  );

  function handleDragStart({ active, activatorEvent }: DragStartEvent) {
    const id = String(active.id);
    const task = statusesRef.current.flatMap(({ tasks }) => tasks).find((t) => t.id === id);
    if (!task) return;
    originRef.current = currentSlot(statusesRef.current, id);
    dropRef.current = originRef.current;
    setShownDrop(null);
    if (activatorEvent instanceof MouseEvent) {
      const start = { x: activatorEvent.clientX, y: activatorEvent.clientY };
      pointerRef.current = start;
      // A press on the card body starts the drag at once; the card shows as
      // dragged from its first pixel of movement. A press on a control starts
      // it only after a few pixels, so the card shows as dragged right away.
      const moved = isOnControl(activatorEvent);
      draggingRef.current = { task, start, moved };
      if (moved) setActive(task);
      window.addEventListener("mousemove", trackPointer, { capture: true });
      window.addEventListener("click", preventClick, { capture: true });
    } else {
      setActive(task);
    }
  }

  function endDrag() {
    setActive(null);
    setShownDrop(null);
    draggingRef.current = null;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    window.removeEventListener("mousemove", trackPointer, { capture: true });
    // The click that follows mouseup comes in a later task; dnd-kit waits
    // 50ms before dropping its own click guard, and so do we.
    setTimeout(() => window.removeEventListener("click", preventClick, { capture: true }), 50);
  }

  function handleDragEnd({ active }: { active: { id: string | number } }) {
    const slot = dropRef.current;
    endDrag();
    if (!slot || isSameSlot(slot, originRef.current)) return;
    const { taskId, ...to } = moveFor(statusesRef.current, String(active.id), slot);
    // The standalone startTransition: no isPending, so nothing fades (the
    // optimistic move is the feedback).
    startTransition(async () => {
      applyOptimisticMove({ taskId, ...to });
      const result = await moveTaskBetween(taskId, to);
      if (!result.ok) {
        toast.error("Couldn't move the Task", { description: result.error });
      }
    });
  }

  return (
    <DndContext
      id="board"
      sensors={sensors}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={endDrag}
    >
      <BoardLayout ref={boardRef} {...props}>
        {optimisticStatuses.map(({ status, tasks }) => {
          const slot = shownDrop?.status === status ? shownDrop : null;
          const others = active ? otherTasks(optimisticStatuses, status, active.id) : tasks;
          const lineAbove = slot && others[slot.index]?.id;
          const lineBelow = slot && slot.index === others.length && others.at(-1)?.id;
          return (
            <BoardColumn
              key={status}
              status={status}
              count={
                <>
                  {tasks.length}
                  <span className="sr-only"> Tasks</span>
                </>
              }
            >
              {tasks.length === 0 || others.length === 0 ? (
                <div className="relative">
                  {slot && <DropLine edge="top" />}
                  {tasks.length === 0 && (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">No Tasks</p>
                  )}
                </div>
              ) : null}
              {tasks.map((task) => (
                <DraggableTaskCard
                  key={task.id}
                  task={task}
                  dimmed={task.id === active?.id}
                  data-pending={task.moving || undefined}
                  dropEdge={
                    task.id === lineAbove ? "top" : task.id === lineBelow ? "bottom" : undefined
                  }
                />
              ))}
            </BoardColumn>
          );
        })}
      </BoardLayout>
      <DragOverlay dropAnimation={null}>
        {active && (
          <MemoTaskCard
            task={active}
            aria-hidden
            inert
            className="cursor-grabbing shadow-lg ring-1 ring-border"
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

/** A card that can be dragged; memoised so only the cards a drag changes re-render. */
const DraggableTaskCard = memo(function DraggableTaskCard({
  task,
  dropEdge,
  dimmed,
  ...props
}: { task: BoardTask; dropEdge?: DropEdge; dimmed: boolean } & ComponentProps<"article">) {
  // isDragging and the transform go unused: the overlay is what moves, and
  // the original fades only once it has (`dimmed`).
  const { setNodeRef, setActivatorNodeRef, attributes, listeners } = useDraggable({
    id: task.id,
    // Still an article to assistive tech; the whole card is the handle.
    attributes: { role: "article", roleDescription: "draggable Task" },
  });
  const ref = useCallback(
    (element: HTMLElement | null) => {
      setNodeRef(element);
      setActivatorNodeRef(element);
    },
    [setNodeRef, setActivatorNodeRef],
  );
  return (
    <MemoTaskCard
      ref={ref}
      task={task}
      dropEdge={dropEdge}
      data-task-id={task.id}
      {...props}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        dimmed && "opacity-40",
      )}
    />
  );
});

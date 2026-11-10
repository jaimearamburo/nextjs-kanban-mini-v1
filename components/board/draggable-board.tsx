"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragStartEvent,
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
import type { BoardTask, Status } from "@/lib/board/domain";
import { cn } from "@/lib/utils";
import { BoardColumn } from "./board-column";
import { BoardLayout } from "./board-layout";
import { useCreatedTasks, withCreated } from "./created-tasks";
import { DropLine } from "./drop-line";
import {
  applyMove,
  currentSlot,
  isSameSlot,
  moveFor,
  otherTasks,
  type ClientStatusTasks,
  type ClientTask,
  type DropSlot,
  type Move,
} from "./move";
import { TaskCard } from "./task-card";

type Point = { x: number; y: number };

/**
 * How long a finger must stay down, and how far it may wander meanwhile, for
 * a drag to start. Moving further first is a swipe, which scrolls instead.
 */
const TOUCH_ACTIVATION = { delay: 250, tolerance: 5 };

/**
 * Edge auto-scroll for a finger: about 600px a second at most, half a second
 * a column. dnd-kit's default (`true`, about 2000px a second) suits a mouse
 * on a wide Board, but a phone's edge zone is about a thumb wide, so a finger
 * there is always near full speed and races across every column.
 */
const TOUCH_AUTO_SCROLL = { acceleration: 3 };

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

/** Where a mouse or touch event is, or null for a touch event with no finger left. */
function pointOf(event: Event): Point | null {
  if (event instanceof MouseEvent) return { x: event.clientX, y: event.clientY };
  // Checked by shape: desktop Firefox and Safari have no TouchEvent at all.
  if ("touches" in event) {
    const touch = (event as TouchEvent).touches[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }
  return null;
}

/**
 * Turns off dnd-kit's default screen-reader text, which would tell people to
 * press the space bar to pick up a card (dragging is by mouse or touch only)
 * and announce raw Task ids.
 */
const SILENT_DRAG = {
  screenReaderInstructions: { draggable: "" },
  announcements: {
    onDragStart: () => undefined,
    onDragOver: () => undefined,
    onDragEnd: () => undefined,
    onDragCancel: () => undefined,
  },
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

/**
 * The Board's columns with drag and drop (ADR-0003). A drop shows a
 * Jira-style line where the card will land, and applies optimistically: the
 * card moves at once and rolls back with a toast if the server refuses.
 */
export function DraggableBoard({
  statuses,
  ...props
}: { statuses: ClientStatusTasks[] } & Omit<ComponentProps<typeof BoardLayout>, "children">) {
  const { created } = useCreatedTasks();
  const shownStatuses = useMemo(() => withCreated(statuses, created), [statuses, created]);
  const [optimisticStatuses, applyOptimisticMove] = useOptimistic(shownStatuses, applyMove);
  const boardRef = useRef<HTMLDivElement>(null);
  // The dragged card, set once it has actually moved: the overlay and the
  // faded original appear on the first pixel, never for a plain click.
  const [active, setActive] = useState<BoardTask | null>(null);
  // Where the drop line shows: only where a drop would change something.
  const [shownDrop, setShownDrop] = useState<DropSlot | null>(null);
  // How the Board scrolls at its edges, set by what started the drag.
  const [autoScroll, setAutoScroll] = useState<true | typeof TOUCH_AUTO_SCROLL>(true);
  // Read by the drag handlers, outside render.
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

  // Stable options: a new object would make dnd-kit rebuild the sensors,
  // and with them every card's listeners, on each render.
  const mouseOptions = useMemo(
    () => ({
      activationConstraint: { distance: 3 },
      bypassActivationConstraint: ({ event }: { event: Event }) => !isOnControl(event),
    }),
    [],
  );
  // A finger drags only after a long press, so a quick swipe still scrolls.
  const touchOptions = useMemo(() => ({ activationConstraint: TOUCH_ACTIVATION }), []);
  const sensors = useSensors(
    useSensor(MouseSensor, mouseOptions),
    useSensor(TouchSensor, touchOptions),
  );

  // Works out the slot under the pointer on the next frame, at most once a frame.
  const trackDrop = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const board = boardRef.current;
      const latest = pointerRef.current;
      const current = draggingRef.current;
      if (board && latest && current) updateDrop(slotAt(board, latest, current.task.id));
    });
  }, [updateDrop]);

  // A drag that starts and ends on the title must not then follow the link.
  const preventClick = useCallback((event: MouseEvent) => event.preventDefault(), []);
  // Drags work out the slot from our own mousemove and touchmove listeners,
  // once a frame, rather than from dnd-kit's onDragMove, which runs a render later.
  const trackPointer = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const dragging = draggingRef.current;
      const point = pointOf(event);
      if (!dragging || !point) return;
      pointerRef.current = point;
      if (!dragging.moved && (point.x !== dragging.start.x || point.y !== dragging.start.y)) {
        dragging.moved = true;
        setActive(dragging.task);
      }
      trackDrop();
    },
    [trackDrop],
  );

  function handleDragStart({ active, activatorEvent }: DragStartEvent) {
    const id = String(active.id);
    const task = statusesRef.current.flatMap(({ tasks }) => tasks).find((t) => t.id === id);
    if (!task) return;
    originRef.current = currentSlot(statusesRef.current, id);
    dropRef.current = originRef.current;
    setShownDrop(null);
    const start = pointOf(activatorEvent);
    if (!start) return;
    pointerRef.current = start;
    // When the card shows as dragged. A mouse press on the card body starts
    // the drag at once, so the card shows as dragged on its first pixel of
    // movement. A mouse press on a control, or a finger, starts the drag only
    // after a few pixels or a long press, so the card shows as dragged at once.
    const byMouse = activatorEvent instanceof MouseEvent;
    setAutoScroll(byMouse ? true : TOUCH_AUTO_SCROLL);
    const moved = !byMouse || isOnControl(activatorEvent);
    draggingRef.current = { task, start, moved };
    if (moved) {
      setActive(task);
    }
    window.addEventListener("mousemove", trackPointer, { capture: true });
    window.addEventListener("touchmove", trackPointer, { capture: true, passive: true });
    window.addEventListener("click", preventClick, { capture: true });
    // Auto-scroll moves the columns under a pointer held still at the edge.
    boardRef.current?.addEventListener("scroll", trackDrop, { passive: true });
  }

  function endDrag() {
    setActive(null);
    setShownDrop(null);
    draggingRef.current = null;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    window.removeEventListener("mousemove", trackPointer, { capture: true });
    window.removeEventListener("touchmove", trackPointer, { capture: true });
    boardRef.current?.removeEventListener("scroll", trackDrop);
    // The click that follows mouseup comes in a later task; dnd-kit waits
    // 50ms before dropping its own click guard, and so do we.
    setTimeout(() => window.removeEventListener("click", preventClick, { capture: true }), 50);
  }

  /** Moves a Task's card at once and saves the move; it rolls back with a toast if refused. */
  const commitMove = useCallback(
    ({ taskId, ...to }: Move) => {
      // The standalone startTransition: no isPending, so nothing fades (the
      // optimistic move is the feedback).
      startTransition(async () => {
        applyOptimisticMove({ taskId, ...to });
        const result = await moveTaskBetween(taskId, to);
        if (!result.ok) {
          toast.error("Couldn't move the Task", { description: result.error });
        }
      });
    },
    [applyOptimisticMove],
  );

  // "Move to…" puts the Task at the top of its new Status. Stable, so it
  // doesn't re-render the memoised cards.
  const moveToTop = useCallback(
    (taskId: string, status: Status) =>
      commitMove(moveFor(statusesRef.current, taskId, { status, index: 0 })),
    [commitMove],
  );

  function handleDragEnd({ active }: { active: { id: string | number } }) {
    const slot = dropRef.current;
    endDrag();
    if (!slot || isSameSlot(slot, originRef.current)) return;
    commitMove(moveFor(statusesRef.current, String(active.id), slot));
  }

  return (
    <DndContext
      id="board"
      sensors={sensors}
      autoScroll={autoScroll}
      accessibility={SILENT_DRAG}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={endDrag}
    >
      <BoardLayout ref={boardRef} dragging={active !== null} {...props}>
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
                  data-pending={task.moving || task.creating || undefined}
                  moveAction={moveToTop}
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
}: { task: ClientTask; dimmed: boolean } & ComponentProps<typeof TaskCard>) {
  // isDragging and the transform go unused: the overlay is what moves, and
  // the original fades only once it has (`dimmed`).
  const creating = task.creating === true;
  const { setNodeRef, setActivatorNodeRef, attributes, listeners } = useDraggable({
    id: task.id,
    // A Task not saved yet has no id the server knows, so it can't move.
    disabled: creating,
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
      // Nor can it be opened or changed: its link and Priority wait for the save.
      inert={creating || undefined}
      className={cn(
        "cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        // A long press drags the card: it mustn't select text or, on iOS,
        // open the title link's preview.
        "pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none]",
        dimmed && "opacity-40",
        creating && "animate-pulse cursor-default opacity-60",
      )}
    />
  );
});

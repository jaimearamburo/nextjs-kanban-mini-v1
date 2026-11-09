import { generateNKeysBetween } from "fractional-indexing";
import type { Database } from "@/lib/db/client";
import type { Guest } from "@/lib/guests/guests";
import {
  STATUSES,
  type Board,
  type Comment,
  type Label,
  type TaskDetail,
  type TeamMember,
  type WriteResult,
} from "./domain";
import {
  addCommentInput,
  archiveCommentInput,
  boardFilter,
  moveTaskInput,
  setAssigneeInput,
  setLabelsInput,
  setPriorityInput,
  setStatusInput,
  taskId,
} from "./schemas";

/**
 * Escapes LIKE wildcards, so search finds `%` and `_` as typed. Prisma's
 * `contains` passes them through to Postgres, where `\` is the escape.
 */
function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, "\\$&");
}

const invalidInput = { ok: false, error: "Invalid input." } as const;
const taskGone = { ok: false, error: "This Task no longer exists." } as const;
/**
 * A drop whose neighbours no longer match the Board: usually another Guest
 * moved one mid-drag. Refused, never guessed: a move lands exactly where its
 * line showed, or not at all.
 */
const boardChanged = {
  ok: false,
  error: "The Board changed while you were dragging. Try again.",
} as const;

// Labels and Team Members are read with the same fields everywhere.
const summary = { id: true, name: true, color: true } as const;

// A Task's fields as its card shows them (BoardTask).
const boardTask = {
  id: true,
  title: true,
  status: true,
  priority: true,
  labels: { orderBy: { position: "asc" }, select: summary },
  assignee: { select: summary },
} as const;

/**
 * The Board's order within a Status: by Rank in byte order (the column's
 * COLLATE "C"), ties broken by Task id.
 */
function compareBoardOrder(a: { id: string; rank: string }, b: { id: string; rank: string }) {
  const byte = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);
  return byte(a.rank, b.rank) || byte(a.id, b.id);
}

/**
 * How many evenly spaced Ranks a drop picks from at random, so drops into
 * the same gap at the same moment rarely tie (1 in this many).
 */
const RANK_CHOICES = 16;

/**
 * The Board module: every business rule for the one shared Board lives here.
 * Its dependency is the database; `random` is replaceable for tests.
 */
export function createBoard(
  db: Database,
  { random = Math.random }: { random?: () => number } = {},
) {
  return {
    /**
     * The Board, narrowed by its search params: a Task is shown if it has any
     * of the Label Filter's Labels and matches the text search. Malformed
     * params and unknown Labels are ignored.
     */
    async getBoard(searchParams?: unknown): Promise<Board> {
      const filter = boardFilter.parse(searchParams);
      const q = escapeLike(filter.q);
      // Ids that aren't Labels are ignored, rather than matching nothing.
      const knownLabelIds =
        filter.labels.length === 0
          ? []
          : (
              await db.label.findMany({
                where: { id: { in: filter.labels } },
                select: { id: true },
              })
            ).map(({ id }) => id);
      const tasks = await db.task.findMany({
        where: {
          archivedAt: null,
          ...(knownLabelIds.length > 0 && {
            labels: { some: { id: { in: knownLabelIds } } },
          }),
          ...(q && {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }),
        },
        orderBy: [{ rank: "asc" }, { id: "asc" }],
        select: boardTask,
      });
      return {
        statuses: STATUSES.map((status) => ({
          status,
          tasks: tasks.filter((task) => task.status === status),
        })),
      };
    },
    /** A Task's detail, or null for an unknown, malformed or Archived id. */
    async getTask(id: unknown): Promise<TaskDetail | null> {
      const parsed = taskId.safeParse(id);
      if (!parsed.success) return null;
      return db.task.findFirst({
        where: { id: parsed.data, archivedAt: null },
        select: { ...boardTask, description: true },
      });
    },
    async listLabels(): Promise<Label[]> {
      return db.label.findMany({
        orderBy: { position: "asc" },
        select: summary,
      });
    },
    async listTeamMembers(): Promise<TeamMember[]> {
      return db.teamMember.findMany({
        orderBy: { position: "asc" },
        select: summary,
      });
    },
    /**
     * Sets a Task's Priority to the final value given, never "cycle"
     * (ADR-0004), so concurrent identical clicks are idempotent. Like every
     * write, it takes the acting Guest, whom Activity will name (#12).
     */
    async setPriority(guest: Guest, input: unknown): Promise<WriteResult> {
      const parsed = setPriorityInput.safeParse(input);
      if (!parsed.success) return invalidInput;
      const { taskId, priority } = parsed.data;
      const { count } = await db.task.updateMany({
        where: { id: taskId, archivedAt: null },
        data: { priority },
      });
      if (count !== 1) return taskGone;
      return { ok: true };
    },
    /** Sets a Task's Status from its detail, at the top of the new Status. */
    async setStatus(guest: Guest, input: unknown): Promise<WriteResult> {
      const parsed = setStatusInput.safeParse(input);
      if (!parsed.success) return invalidInput;
      const { taskId, status } = parsed.data;
      const current = await db.task.findFirst({
        where: { id: taskId, archivedAt: null },
        select: { status: true },
      });
      if (!current) return taskGone;
      if (current.status === status) return { ok: true };
      const top = await db.task.findFirst({
        where: { status, archivedAt: null },
        orderBy: [{ rank: "asc" }, { id: "asc" }],
        select: { rank: true },
      });
      const rank = generateNKeysBetween(null, top?.rank ?? null, RANK_CHOICES)[
        Math.floor(random() * RANK_CHOICES)
      ];
      const { count } = await db.task.updateMany({
        where: { id: taskId, archivedAt: null },
        data: { status, rank },
      });
      if (count !== 1) return taskGone;
      return { ok: true };
    },
    /** Assigns a Task to a Team Member on the roster, or unassigns it with null. */
    async setAssignee(guest: Guest, input: unknown): Promise<WriteResult> {
      const parsed = setAssigneeInput.safeParse(input);
      if (!parsed.success) return invalidInput;
      const { taskId, assigneeId } = parsed.data;
      if (assigneeId !== null) {
        const member = await db.teamMember.findUnique({
          where: { id: assigneeId },
          select: { id: true },
        });
        if (!member) return invalidInput;
      }
      const { count } = await db.task.updateMany({
        where: { id: taskId, archivedAt: null },
        data: { assigneeId },
      });
      if (count !== 1) return taskGone;
      return { ok: true };
    },
    /** Replaces a Task's Labels with the final set given (ADR-0004). */
    async setLabels(guest: Guest, input: unknown): Promise<WriteResult> {
      const parsed = setLabelsInput.safeParse(input);
      if (!parsed.success) return invalidInput;
      const { taskId, labelIds } = parsed.data;
      const known = await db.label.count({ where: { id: { in: labelIds } } });
      if (known !== labelIds.length) return invalidInput;
      try {
        await db.task.update({
          where: { id: taskId, archivedAt: null },
          data: { labels: { set: labelIds.map((id) => ({ id })) } },
        });
      } catch (error) {
        // P2025: no such Task. A relation write can't go through updateMany.
        if ((error as { code?: string }).code === "P2025") return taskGone;
        throw error;
      }
      return { ok: true };
    },
    /**
     * Moves a Task to a Status, between the two cards it was dropped
     * between. Only the moved Task is written: it gets a fractional Rank
     * between its neighbours' (ADR-0001). A Status change will record
     * Activity once Activity lands (#12); a reorder within a Status won't.
     */
    async moveTask(guest: Guest, input: unknown): Promise<WriteResult> {
      const parsed = moveTaskInput.safeParse(input);
      if (!parsed.success) return invalidInput;
      const { taskId, status, beforeId, afterId } = parsed.data;
      // Read first, so a Task that's gone is reported as gone, whatever its
      // neighbours look like.
      const moving = await db.task.findFirst({
        where: { id: taskId, archivedAt: null },
        select: { id: true },
      });
      if (!moving) return taskGone;
      const neighbourIds = [beforeId, afterId].filter((id) => id !== null);
      if (neighbourIds.includes(taskId)) return boardChanged;
      // A neighbour must be on the Board in the target Status.
      const neighbours = await db.task.findMany({
        where: { id: { in: neighbourIds }, status, archivedAt: null },
        select: { id: true, rank: true },
      });
      if (neighbours.length !== neighbourIds.length) return boardChanged;
      const before = neighbours.find((task) => task.id === beforeId) ?? null;
      const after = neighbours.find((task) => task.id === afterId) ?? null;
      if (before && after && compareBoardOrder(before, after) >= 0) return boardChanged;
      // A random pick among several Ranks in the gap, so concurrent drops
      // into it rarely tie. Neighbours that did tie leave no Rank strictly
      // between them, so the Task shares theirs and its id places it within
      // the tie: still deterministic, still one row written.
      const rank =
        before && after && before.rank === after.rank
          ? before.rank
          : generateNKeysBetween(before?.rank ?? null, after?.rank ?? null, RANK_CHOICES)[
              Math.floor(random() * RANK_CHOICES)
            ];
      const { count } = await db.task.updateMany({
        where: { id: taskId, archivedAt: null },
        data: { status, rank },
      });
      if (count !== 1) return taskGone;
      return { ok: true };
    },
    /** A Task's Comments, oldest first. Empty for an unknown, malformed or Archived id. */
    async listComments(id: unknown): Promise<Comment[]> {
      const parsed = taskId.safeParse(id);
      if (!parsed.success) return [];
      const comments = await db.comment.findMany({
        where: { taskId: parsed.data, archivedAt: null, task: { archivedAt: null } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          body: true,
          createdAt: true,
          authorGuest: { select: summary },
          authorTeamMember: { select: summary },
        },
      });
      return comments.map(({ authorGuest, authorTeamMember, ...comment }) => ({
        ...comment,
        // Exactly one author is set (CHECK constraint).
        author: (authorGuest ?? authorTeamMember)!,
      }));
    },
    /** Adds a Guest's Comment to a Task. */
    async addComment(guest: Guest, input: unknown): Promise<WriteResult> {
      const parsed = addCommentInput.safeParse(input);
      if (!parsed.success) return invalidInput;
      const { taskId, body } = parsed.data;
      const task = await db.task.findFirst({
        where: { id: taskId, archivedAt: null },
        select: { id: true },
      });
      if (!task) return taskGone;
      await db.comment.create({ data: { taskId, body, authorGuestId: guest.id } });
      return { ok: true };
    },
    /**
     * Archives a Comment, keeping its row (ADR-0002). Any Guest can archive
     * any Comment, and a Comment already archived is left as it is.
     */
    async archiveComment(guest: Guest, input: unknown): Promise<WriteResult> {
      const parsed = archiveCommentInput.safeParse(input);
      if (!parsed.success) return invalidInput;
      await db.comment.updateMany({
        where: { id: parsed.data.commentId, archivedAt: null },
        data: { archivedAt: new Date() },
      });
      return { ok: true };
    },
  };
}

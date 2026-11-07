import type { Database } from "@/lib/db/client";
import type { Guest } from "@/lib/guests/guests";
import {
  STATUSES,
  type Board,
  type Label,
  type TaskDetail,
  type TeamMember,
  type WriteResult,
} from "./domain";
import { boardFilter, setPriorityInput, taskId } from "./schemas";

/**
 * Escapes LIKE wildcards, so search finds `%` and `_` as typed. Prisma's
 * `contains` passes them through to Postgres, where `\` is the escape.
 */
function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, "\\$&");
}

const invalidInput = { ok: false, error: "Invalid input." } as const;
const taskGone = { ok: false, error: "This Task no longer exists." } as const;

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
 * The Board module: every business rule for the one shared Board lives here.
 * Its only dependency is the database.
 */
export function createBoard(db: Database) {
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
      return count === 1 ? { ok: true } : taskGone;
    },
  };
}

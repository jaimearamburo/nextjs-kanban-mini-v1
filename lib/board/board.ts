import type { Database } from "@/lib/db/client";
import type { Guest } from "@/lib/guests/guests";
import {
  STATUSES,
  type Board,
  type Label,
  type TeamMember,
  type WriteResult,
} from "./domain";
import { setPriorityInput } from "./schemas";

const invalidInput = { ok: false, error: "Invalid input." } as const;
const taskGone = { ok: false, error: "This Task no longer exists." } as const;

// Labels and Team Members are read with the same fields everywhere.
const summary = { id: true, name: true, color: true } as const;

/**
 * The Board module: every business rule for the one shared Board lives here.
 * Its only dependency is the database.
 */
export function createBoard(db: Database) {
  return {
    async getBoard(): Promise<Board> {
      const tasks = await db.task.findMany({
        where: { archivedAt: null },
        orderBy: [{ rank: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          labels: {
            orderBy: { position: "asc" },
            select: summary,
          },
          assignee: { select: summary },
        },
      });
      return {
        statuses: STATUSES.map((status) => ({
          status,
          tasks: tasks.filter((task) => task.status === status),
        })),
      };
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

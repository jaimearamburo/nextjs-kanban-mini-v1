import type { Database } from "@/lib/db/client";
import { STATUSES, type Board, type Label, type TeamMember } from "./domain";

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
  };
}

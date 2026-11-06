import type { Priority, Status } from "@/lib/generated/prisma/enums";

export type { Priority, Status };

/** The fixed workflow, in column order. */
export const STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
] as const satisfies readonly Status[];

export const STATUS_NAMES: Record<Status, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

/** Display names, in display order. */
export const PRIORITY_NAMES: Record<Priority, string> = {
  NONE: "None",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export type Label = { id: string; name: string; color: string };

export type TeamMember = { id: string; name: string; color: string };

/** A Task as its card on the Board shows it. */
export type BoardTask = {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  labels: Label[];
  assignee: TeamMember | null;
};

/** One Status and its Tasks in Rank order. */
export type StatusTasks = { status: Status; tasks: BoardTask[] };

/** Every Status in workflow order, each with its Tasks in Rank order. */
export type Board = { statuses: StatusTasks[] };

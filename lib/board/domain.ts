import type { ActionResult } from "@/lib/action-result";
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

/** Every Priority, in display and cycle order. */
export const PRIORITIES = [
  "NONE",
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const satisfies readonly Priority[];

/**
 * The Priority a click on the card's icon moves to. The client sends the
 * result as the final value, never "cycle" (ADR-0004).
 */
export function nextPriority(priority: Priority): Priority {
  return PRIORITIES[(PRIORITIES.indexOf(priority) + 1) % PRIORITIES.length];
}

/** Display names. */
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

/** A Task as its detail view shows it. */
export type TaskDetail = BoardTask & { description: string };

/** One Status and its Tasks in Rank order. */
export type StatusTasks = { status: Status; tasks: BoardTask[] };

/** Every Status in workflow order, each with its Tasks in Rank order. */
export type Board = { statuses: StatusTasks[] };

/** The longest Comment a Guest can add. */
export const COMMENT_MAX_LENGTH = 1000;

/** A Guest, or a Team Member on seeded Comments. */
export type CommentAuthor = { id: string; name: string; color: string };

/** A Comment as its Task shows it. Never an Archived Comment. */
export type Comment = { id: string; body: string; createdAt: Date; author: CommentAuthor };

/** What every Board write returns. */
export type WriteResult = ActionResult;

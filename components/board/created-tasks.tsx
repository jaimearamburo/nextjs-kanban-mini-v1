"use client";

import { createContext, use, useOptimistic, type ReactNode } from "react";
import type { ClientStatusTasks, ClientTask } from "./move";

type CreatedTasks = {
  /** Tasks being created, newest first. Each is gone once its create finishes. */
  created: ClientTask[];
  /** Shows a Task on the Board until the create action it's called in finishes. */
  addCreated: (task: ClientTask) => void;
};

const CreatedTasksContext = createContext<CreatedTasks>({
  created: [],
  addCreated: () => {},
});

/**
 * Tasks the create form is creating, shared with the Board. The form is in
 * the modal slot and the Board in the page, so the optimistic state lives
 * above both, in the root layout. A create's card leaves this list when its
 * action finishes, in the same render that brings the saved Task (the action
 * refreshes the Board).
 */
export function CreatedTasksProvider({ children }: { children: ReactNode }) {
  const [created, addCreated] = useOptimistic<ClientTask[], ClientTask>([], (current, task) => [
    task,
    ...current,
  ]);
  return <CreatedTasksContext value={{ created, addCreated }}>{children}</CreatedTasksContext>;
}

export function useCreatedTasks() {
  return use(CreatedTasksContext);
}

/** The Board with the Tasks being created on top of their Statuses, as they'll be saved. */
export function withCreated(
  statuses: ClientStatusTasks[],
  created: ClientTask[],
): ClientStatusTasks[] {
  if (created.length === 0) return statuses;
  return statuses.map(({ status, tasks }) => ({
    status,
    tasks: [...created.filter((task) => task.status === status), ...tasks],
  }));
}

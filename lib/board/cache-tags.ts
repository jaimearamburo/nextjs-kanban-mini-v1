/** Cache tags for Task reads. Writes call `updateTag` on the Task they affect. */
export const cacheTags = {
  task: (id: string) => `task:${id}`,
} as const;

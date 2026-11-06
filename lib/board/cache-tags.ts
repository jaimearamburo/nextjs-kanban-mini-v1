/** Cache tags for Board reads. Writes call `updateTag` on the ones they affect. */
export const cacheTags = {
  board: "board",
  task: (id: string) => `task:${id}`,
} as const;

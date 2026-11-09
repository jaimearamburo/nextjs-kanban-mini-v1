import { z } from "zod";
import { PRIORITIES, STATUSES } from "./domain";

// Shared Zod schemas for every Board input, reads and writes alike. The Board
// module parses with them at its boundary; the client can reuse them for form errors.

export const taskId = z.uuid();

export const priority = z.enum(PRIORITIES);

export const status = z.enum(STATUSES);

export const setPriorityInput = z.object({ taskId, priority });

export const setStatusInput = z.object({ taskId, status });

/** `null` unassigns. Whether the id is on the roster is checked by the Board module. */
export const setAssigneeInput = z.object({ taskId, assigneeId: z.uuid().nullable() });

const LABEL_ID = /^[a-z0-9-]{1,32}$/;

/** The final set of Labels. Whether they're in the fixed set is checked by the Board module. */
export const setLabelsInput = z.object({
  taskId,
  labelIds: z.array(z.string().regex(LABEL_ID)).transform((ids) => [...new Set(ids)]),
});

/**
 * A drop: the target Status and the cards the Task lands between, as the
 * dropping Guest sees them. `beforeId` is the card above (null at the top),
 * `afterId` the card below (null at the bottom).
 */
export const moveTaskInput = z.object({
  taskId,
  status,
  beforeId: taskId.nullable(),
  afterId: taskId.nullable(),
});

/** A search param's string values; a repeated param (`?a=1&a=2`) has several. */
function paramValues(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.filter((v): v is string => typeof v === "string");
}

/**
 * The Board's search params, `?labels=` (comma-separated Label
 * ids, as in `?labels=frontend,bug`) and `?q=` (text search).
 * Never fails: anything malformed is dropped, leaving the Board unfiltered.
 */
export const boardFilter = z
  .object({
    // Sorted, so equivalent URLs (`bug,docs` and `docs,bug`) share a cache entry.
    labels: z
      .unknown()
      .optional()
      .transform((value) =>
        [
          ...new Set(
            paramValues(value)
              .flatMap((v) => v.split(","))
              .filter((id) => LABEL_ID.test(id)),
          ),
        ].sort(),
      ),
    q: z
      .unknown()
      .optional()
      .transform((value) => paramValues(value)[0]?.trim() ?? ""),
  })
  .catch({ labels: [], q: "" });

export type BoardFilter = z.output<typeof boardFilter>;

/** A drop, as the client sends it and the Board module takes it. */
export type MoveTaskInput = z.output<typeof moveTaskInput>;

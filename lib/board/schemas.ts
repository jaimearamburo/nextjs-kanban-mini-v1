import { z } from "zod";
import {
  COMMENT_MAX_LENGTH,
  PRIORITIES,
  STATUSES,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH,
} from "./domain";

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

export const addCommentInput = z.object({
  taskId,
  body: z
    .string()
    .trim()
    .min(1)
    .max(COMMENT_MAX_LENGTH)
    // Postgres text can't store a NUL byte: it would throw instead of being refused.
    .refine((body) => !body.includes("\0")),
});

export const archiveCommentInput = z.object({ commentId: z.uuid() });

/** Postgres text can't store a NUL byte: it would throw instead of being refused. */
const NO_NUL = [
  (text: string) => !text.includes("\0"),
  "This contains a character that can't be saved.",
] as const;

// The create form's messages for a missing title and for a choice outside its
// options. The Board module uses the Assignee and Labels ones for its roster
// and fixed-set checks.
const ENTER_TITLE = "Enter a title.";
const CHOOSE_STATUS = "Choose a Status from the list.";
const CHOOSE_PRIORITY = "Choose a Priority from the list.";
export const CHOOSE_ASSIGNEE = "Choose a Team Member from the list.";
export const CHOOSE_LABELS = "Choose Labels from the list.";

/**
 * A new Task. Only the title is required. Each refusal's message is shown
 * under its field.
 */
export const createTaskInput = z.object({
  title: z
    .string(ENTER_TITLE)
    .trim()
    .min(1, ENTER_TITLE)
    .max(
      TASK_TITLE_MAX_LENGTH,
      `Keep the title to ${TASK_TITLE_MAX_LENGTH.toLocaleString("en")} characters or fewer.`,
    )
    .refine(...NO_NUL),
  description: z
    .string()
    .trim()
    .max(
      TASK_DESCRIPTION_MAX_LENGTH,
      `Keep the description to ${TASK_DESCRIPTION_MAX_LENGTH.toLocaleString("en")} characters or fewer.`,
    )
    .refine(...NO_NUL)
    .default(""),
  status: z.enum(STATUSES, CHOOSE_STATUS).default("TODO"),
  priority: z.enum(PRIORITIES, CHOOSE_PRIORITY).default("NONE"),
  /** Whether the id is on the roster is checked by the Board module. */
  assigneeId: z.uuid(CHOOSE_ASSIGNEE).nullable().default(null),
  /** Whether they're in the fixed set is checked by the Board module. */
  labelIds: z
    .array(z.string(CHOOSE_LABELS).regex(LABEL_ID, CHOOSE_LABELS), CHOOSE_LABELS)
    .default([])
    .transform((ids) => [...new Set(ids)]),
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

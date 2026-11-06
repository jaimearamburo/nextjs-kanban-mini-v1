/**
 * What a Server Action returns. Expected failures (invalid input, a Task
 * that's gone, a demo-controls failure) come back as `ok: false` and drive
 * the rollback and toast; unexpected errors are thrown to error boundaries.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

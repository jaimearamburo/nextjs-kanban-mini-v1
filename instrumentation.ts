/**
 * Runs once as each server starts: checks the Ably key against ADR-0006 (the
 * production app only in production, nothing else there) and that the Board
 * channel can be scoped, so a misconfigured server crashes before it serves.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getRealtime } = await import("./lib/realtime/server");
  getRealtime();
}

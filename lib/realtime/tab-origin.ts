let origin: string | null = null;

/**
 * This browser tab's origin id: sent with each write, echoed in its change
 * event, so the tab that made a change skips refreshing for it. Two tabs of
 * the same Guest have different origins, so they still sync with each other.
 */
export function getTabOrigin(): string {
  // crypto.randomUUID only exists in secure contexts; a LAN `next dev` isn't one.
  origin ??=
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return origin;
}

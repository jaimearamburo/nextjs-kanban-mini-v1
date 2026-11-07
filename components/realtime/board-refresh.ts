import { createRefreshScheduler, type RefreshScheduler } from "@/lib/realtime/refresh-scheduler";
import { getTabOrigin } from "@/lib/realtime/tab-origin";

// One refresh scheduler per tab: the sync connection feeds it change events,
// and drags hold it back.

let scheduler: RefreshScheduler | null = null;
let refresh: (() => void) | null = null;

/** This tab's refresh scheduler. */
export function boardRefreshes(): RefreshScheduler {
  scheduler ??= createRefreshScheduler({
    origin: getTabOrigin(),
    refresh: () => refresh?.(),
  });
  return scheduler;
}

/** Sets how a refresh is done (a soft router refresh), or null to stop. */
export function setBoardRefresh(next: (() => void) | null) {
  refresh = next;
}

/**
 * Holds live refreshes back while a drag is in progress (ADR-0005). Call the
 * returned function when the drag ends; one refresh runs if any were held.
 */
export function holdBoardRefreshes(): () => void {
  return boardRefreshes().hold();
}

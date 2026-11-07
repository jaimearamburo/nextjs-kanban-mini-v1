/**
 * How long after the first change of a burst the refresh runs. Changes
 * arriving meanwhile ride along, so a burst costs one refresh.
 */
export const BURST_MS = 150;

/**
 * Turns change events into soft refreshes (ADR-0005). It skips changes this
 * tab made itself, combines bursts into one refresh, and holds refreshes
 * while a drag is in progress, running one when the drag ends if any were held.
 */
export function createRefreshScheduler({
  origin,
  refresh,
}: {
  /** This tab's origin id, which its own writes' events carry. */
  origin: string;
  refresh: () => void;
}) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let holds = 0;
  let pending = false;

  function schedule() {
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      if (holds > 0) return; // Still pending; the last release runs it.
      pending = false;
      refresh();
    }, BURST_MS);
  }

  /** Asks for a refresh: soon, or when the last hold is released. */
  function invalidate() {
    pending = true;
    if (holds === 0) schedule();
  }

  return {
    /** A change event from the Board channel. */
    receive(change: { origin: string | null }) {
      if (change.origin === origin) return;
      invalidate();
    },
    invalidate,
    /** Holds refreshes back until the returned release is called. */
    hold(): () => void {
      holds++;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        holds--;
        if (holds === 0 && pending) schedule();
      };
    },
  };
}

export type RefreshScheduler = ReturnType<typeof createRefreshScheduler>;

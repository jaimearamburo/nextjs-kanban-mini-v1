import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BURST_MS, createRefreshScheduler } from "./refresh-scheduler";

const mine = "my-tab";
const theirs = { origin: "their-tab" };

function setup() {
  const refresh = vi.fn();
  const scheduler = createRefreshScheduler({ origin: mine, refresh });
  return { refresh, scheduler };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createRefreshScheduler", () => {
  test("refreshes once for a change from another tab", () => {
    const { refresh, scheduler } = setup();

    scheduler.receive(theirs);
    vi.advanceTimersByTime(BURST_MS);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test("skips changes this tab made itself", () => {
    const { refresh, scheduler } = setup();

    scheduler.receive({ origin: mine });
    vi.advanceTimersByTime(BURST_MS * 10);

    expect(refresh).not.toHaveBeenCalled();
  });

  test("a change with no origin came from elsewhere, so it refreshes", () => {
    const { refresh, scheduler } = setup();

    scheduler.receive({ origin: null });
    vi.advanceTimersByTime(BURST_MS);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test("combines a burst of changes into one refresh, then refreshes again for later ones", () => {
    const { refresh, scheduler } = setup();

    for (let i = 0; i < 5; i++) scheduler.receive(theirs);
    vi.advanceTimersByTime(BURST_MS);
    expect(refresh).toHaveBeenCalledTimes(1);

    scheduler.receive(theirs);
    vi.advanceTimersByTime(BURST_MS);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  test("a steady stream of changes still refreshes within the burst window", () => {
    const { refresh, scheduler } = setup();

    // One change every 10ms never lets a trailing-only debounce fire.
    for (let t = 0; t < BURST_MS; t += 10) {
      scheduler.receive(theirs);
      vi.advanceTimersByTime(10);
    }

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test("holds refreshes during a drag, then catches up once when it ends", () => {
    const { refresh, scheduler } = setup();

    const release = scheduler.hold();
    scheduler.receive(theirs);
    scheduler.receive(theirs);
    vi.advanceTimersByTime(BURST_MS * 10);
    expect(refresh).not.toHaveBeenCalled();

    release();
    vi.advanceTimersByTime(BURST_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test("a refresh already scheduled when a drag starts waits for it to end", () => {
    const { refresh, scheduler } = setup();

    scheduler.receive(theirs);
    const release = scheduler.hold();
    vi.advanceTimersByTime(BURST_MS * 10);
    expect(refresh).not.toHaveBeenCalled();

    release();
    vi.advanceTimersByTime(BURST_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test("a drag with nothing held back doesn't refresh when it ends", () => {
    const { refresh, scheduler } = setup();

    scheduler.hold()();
    vi.advanceTimersByTime(BURST_MS * 10);

    expect(refresh).not.toHaveBeenCalled();
  });

  test("waits for every hold to be released, and releasing twice counts once", () => {
    const { refresh, scheduler } = setup();

    const first = scheduler.hold();
    const second = scheduler.hold();
    scheduler.receive(theirs);
    first();
    first();
    vi.advanceTimersByTime(BURST_MS * 10);
    expect(refresh).not.toHaveBeenCalled();

    second();
    vi.advanceTimersByTime(BURST_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

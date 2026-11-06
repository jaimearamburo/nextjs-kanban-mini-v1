import { z } from "zod";

// Demo controls: per-browser artificial latency and failure injection, so a
// viewer can watch optimistic updates, pending states and rollbacks happen.
// Reading and writing the cookie is left to the caller.

export const LATENCIES = ["off", "1s", "3s"] as const;
export const FAILURES = ["off", "random", "always"] as const;

export type Latency = (typeof LATENCIES)[number];
export type Failure = (typeof FAILURES)[number];

export const demoSettings = z.object({
  latency: z.enum(LATENCIES),
  failure: z.enum(FAILURES),
});
export type DemoSettings = z.infer<typeof demoSettings>;

/** The default: no added latency and no injected failures. */
export const DEMO_OFF: DemoSettings = { latency: "off", failure: "off" };

/** The settings in a cookie value. Anything missing or malformed means off. */
export function parseDemoSettings(cookieValue: string | undefined): DemoSettings {
  if (!cookieValue) return DEMO_OFF;
  let json: unknown;
  try {
    json = JSON.parse(cookieValue);
  } catch {
    return DEMO_OFF;
  }
  const result = demoSettings.safeParse(json);
  return result.success ? result.data : DEMO_OFF;
}

/** The cookie value for these settings. */
export function serializeDemoSettings(settings: DemoSettings): string {
  return JSON.stringify(demoSettings.parse(settings));
}

const LATENCY_MS: Record<Latency, number> = { off: 0, "1s": 1000, "3s": 3000 };
const FAILURE_RATE: Record<Failure, number> = { off: 0, random: 0.3, always: 1 };

type Clock = {
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
};

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Applies the demo controls before an action: waits out the added latency,
 * then says whether the action should go ahead or fail.
 */
export async function applyDemoControls(
  settings: DemoSettings,
  { sleep = realSleep, random = Math.random }: Clock = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ms = LATENCY_MS[settings.latency];
  if (ms > 0) await sleep(ms);
  if (random() < FAILURE_RATE[settings.failure]) {
    return { ok: false, error: "Simulated failure (demo controls)." };
  }
  return { ok: true };
}

import "server-only";
import { cookies } from "next/headers";
import {
  applyDemoControls,
  parseDemoSettings,
  serializeDemoSettings,
  type DemoSettings,
} from "./demo-controls";

export * from "./demo-controls";

const DEMO_COOKIE = "demo-controls";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** This browser's demo controls. Reads the request, so call it inside Suspense. */
export async function getDemoSettings(): Promise<DemoSettings> {
  return parseDemoSettings((await cookies()).get(DEMO_COOKIE)?.value);
}

/** Remembers this browser's demo controls. Server Actions only. */
export async function saveDemoSettings(settings: DemoSettings): Promise<void> {
  (await cookies()).set(DEMO_COOKIE, serializeDemoSettings(settings), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

/**
 * Applies this browser's demo controls around a Server Action: added latency,
 * then maybe a simulated failure. Only the browser that set them is affected.
 */
export async function runDemoControls() {
  return applyDemoControls(await getDemoSettings());
}

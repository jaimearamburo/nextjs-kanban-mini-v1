import "server-only";
import { execSync } from "node:child_process";
import * as Ably from "ably";
import { after } from "next/server";
import type { BoardChange } from "@/lib/board/domain";
import { assertAblyAppForEnvironment, boardChannel, createBoardToken } from "./config";
import { CHANGE_EVENT } from "./events";

type Realtime = { apiKey: string; channel: string };

/** The git branch this server was started from, for channel scoping outside production. */
function gitBranch(): string | undefined {
  const env = process.env;
  const fromCi = env.VERCEL_GIT_COMMIT_REF || env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME;
  if (fromCi) return fromCi;
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

let cached: Realtime | null | undefined;

/**
 * This environment's Ably key and Board channel, checked against ADR-0006:
 * the wrong Ably app crashes the server. Without a key, real-time sync is off
 * (fine for a contributor's machine) except in production, where it's an error.
 */
export function getRealtime(): Realtime | null {
  if (cached !== undefined) return cached;
  const production = process.env.VERCEL_ENV === "production";
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    if (production) throw new Error("ABLY_API_KEY is not set in production.");
    console.warn("ABLY_API_KEY is not set, so real-time Board sync is off.");
    return (cached = null);
  }
  assertAblyAppForEnvironment(apiKey, {
    production,
    productionAppId: process.env.PRODUCTION_ABLY_APP_ID,
  });
  return (cached = { apiKey, channel: boardChannel({ production, branch: gitBranch() }) });
}

let rest: Ably.Rest | null = null;

/**
 * The Board module's "publish change" port, on Ably. Published after the
 * response, so the write's cache tags are already updated when other
 * browsers refresh. A failed publish is logged, never turned into a failed
 * write: the change has committed.
 */
export function publishBoardChange(change: BoardChange): void {
  const realtime = getRealtime();
  if (!realtime) return;
  after(async () => {
    try {
      rest ??= new Ably.Rest({ key: realtime.apiKey });
      await rest.channels.get(realtime.channel).publish(CHANGE_EVENT, change);
    } catch (error) {
      console.error("Couldn't publish a Board change.", error);
    }
  });
}

/** A token request letting a Guest subscribe to this environment's Board channel. */
export async function issueBoardToken(guestId: string) {
  const realtime = getRealtime();
  if (!realtime) return null;
  return createBoardToken({ apiKey: realtime.apiKey, guestId, channel: realtime.channel });
}

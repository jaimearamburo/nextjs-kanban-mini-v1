import * as Ably from "ably";

// Environment isolation for real-time sync (ADR-0006): production uses the
// `kanban-prod` Ably app, everything else `kanban-dev`, with channels scoped
// by git branch. Pure functions; reading the environment is left to callers.

/** Production, or which git branch everything else is scoped to. */
export type RealtimeScope = { production: boolean; branch: string | undefined };

/**
 * The Board's Ably channel for this environment. Outside production it is
 * scoped by git branch, so previews of different branches never hear each
 * other (an unknown branch is refused, never guessed); a local server and its branch's preview share the dev database, and
 * so the channel too.
 */
export function boardChannel({ production, branch }: RealtimeScope): string {
  if (production) return "board:production";
  const slug = (branch ?? "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  // A shared fallback would let every branch hear every other, so refuse.
  if (!slug) throw new Error("The git branch is unknown, so the Board channel can't be scoped. Refusing to run.");
  return `board:dev:${slug}`;
}

/**
 * Refuses an Ably key from the wrong app: production must use the production
 * app, and nothing else may. The app id is the part of the key before the ".".
 */
export function assertAblyAppForEnvironment(
  apiKey: string,
  { production, productionAppId }: { production: boolean; productionAppId: string | undefined },
): void {
  if (!productionAppId) {
    throw new Error(
      "PRODUCTION_ABLY_APP_ID is not set, so the production Ably app can't be ruled out. Refusing to run.",
    );
  }
  const isProductionApp = apiKey.split(".")[0] === productionAppId;
  if (production && !isProductionApp) {
    throw new Error("Production must use the production Ably app. Refusing to run.");
  }
  if (!production && isProductionApp) {
    throw new Error("Refusing to use the production Ably app outside production.");
  }
}

/** How long an issued token lasts; Ably's client renews it before it expires. */
const TOKEN_TTL_MS = 30 * 60 * 1000;

/**
 * A signed Ably token request for a Guest: the Guest id is the client id, and
 * it may only subscribe to this environment's Board channel. Signed locally;
 * the key's secret never leaves the server.
 */
export async function createBoardToken({
  apiKey,
  guestId,
  channel,
}: {
  apiKey: string;
  guestId: string;
  channel: string;
}): Promise<Ably.TokenRequest> {
  const rest = new Ably.Rest({ key: apiKey });
  return rest.auth.createTokenRequest({
    clientId: guestId,
    capability: { [channel]: ["subscribe"] },
    ttl: TOKEN_TTL_MS,
  });
}

import { describe, expect, test } from "vitest";
import { assertAblyAppForEnvironment, boardChannel, createBoardToken } from "./config";

describe("boardChannel", () => {
  test("production has its own Board channel, whatever the branch", () => {
    expect(boardChannel({ production: true, branch: "main" })).toBe("board:production");
    expect(boardChannel({ production: true, branch: undefined })).toBe("board:production");
  });

  test("everywhere else, the Board channel is scoped by git branch", () => {
    const one = boardChannel({ production: false, branch: "feature/14-realtime-board-sync" });
    const two = boardChannel({ production: false, branch: "feature/15-presence" });

    expect(one).toBe("board:dev:feature-14-realtime-board-sync");
    expect(two).not.toBe(one);
    expect(boardChannel({ production: false, branch: "main" })).not.toBe("board:production");
  });

  test("a branch name can't escape its scope", () => {
    expect(boardChannel({ production: false, branch: "a:b*[c] d" })).toBe("board:dev:a-b-c-d");
  });

  test("refuses to guess a channel when the branch is unknown, so previews never share one", () => {
    expect(() => boardChannel({ production: false, branch: undefined })).toThrow(/branch/);
    expect(() => boardChannel({ production: false, branch: "///" })).toThrow(/branch/);
  });
});

describe("assertAblyAppForEnvironment", () => {
  const productionAppId = "prodApp";
  const prodKey = "prodApp.key1:secret";
  const devKey = "devApp.key1:secret";

  test("production must use the production Ably app", () => {
    expect(() =>
      assertAblyAppForEnvironment(prodKey, { production: true, productionAppId }),
    ).not.toThrow();
    expect(() =>
      assertAblyAppForEnvironment(devKey, { production: true, productionAppId }),
    ).toThrow(/production Ably app/);
  });

  test("nothing but production may use the production Ably app", () => {
    expect(() =>
      assertAblyAppForEnvironment(devKey, { production: false, productionAppId }),
    ).not.toThrow();
    expect(() =>
      assertAblyAppForEnvironment(prodKey, { production: false, productionAppId }),
    ).toThrow(/production Ably app/);
  });

  test("refuses to run when the production app id is unknown", () => {
    expect(() =>
      assertAblyAppForEnvironment(devKey, { production: false, productionAppId: undefined }),
    ).toThrow(/PRODUCTION_ABLY_APP_ID/);
  });
});

describe("createBoardToken", () => {
  const apiKey = "devApp.key1:not-a-real-secret";
  const guestId = "00000000-0000-7000-8000-000000000001";
  const channel = "board:dev:feature-14";

  test("names the Guest as the client and allows only subscribing to this environment's Board channel", async () => {
    const token = await createBoardToken({ apiKey, guestId, channel });

    expect(token.clientId).toBe(guestId);
    expect(JSON.parse(token.capability as string)).toEqual({ [channel]: ["subscribe"] });
  });

  test("is short-lived and never carries the key's secret", async () => {
    const token = await createBoardToken({ apiKey, guestId, channel });

    expect(token.ttl).toBeLessThanOrEqual(60 * 60 * 1000);
    expect(JSON.stringify(token)).not.toContain("not-a-real-secret");
  });
});

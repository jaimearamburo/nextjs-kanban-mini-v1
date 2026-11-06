import { describe, expect, test } from "vitest";
import {
  applyDemoControls,
  parseDemoSettings,
  serializeDemoSettings,
  type DemoSettings,
} from "./demo-controls";

const OFF = { latency: "off", failure: "off" };

describe("parseDemoSettings", () => {
  test.each([
    ["no cookie", undefined],
    ["not JSON", "always-fail"],
    ["an unknown latency", JSON.stringify({ latency: "10s", failure: "off" })],
    ["the wrong shape", JSON.stringify(["3s", "always"])],
  ])("treats %s as everything off", (_, cookieValue) => {
    expect(parseDemoSettings(cookieValue)).toEqual(OFF);
  });

  test("reads back the settings it saved", () => {
    const settings = { latency: "3s", failure: "always" } as const;

    expect(parseDemoSettings(serializeDemoSettings(settings))).toEqual(settings);
  });
});

describe("applyDemoControls", () => {
  /** Applies the settings with a recording sleep and a fixed random draw. */
  async function apply(settings: DemoSettings, randomDraw = 0.5) {
    const slept: number[] = [];
    const result = await applyDemoControls(settings, {
      sleep: async (ms) => void slept.push(ms),
      random: () => randomDraw,
    });
    return { result, slept };
  }

  test.each([
    ["off", []],
    ["1s", [1000]],
    ["3s", [3000]],
  ] as const)("latency %s waits %j ms", async (latency, expected) => {
    const { result, slept } = await apply({ latency, failure: "off" });

    expect(slept).toEqual(expected);
    expect(result).toEqual({ ok: true });
  });

  const FAILED = { ok: false, error: "Simulated failure (demo controls)." };

  test.each([
    ["off", 0, { ok: true }],
    ["always", 0.99, FAILED],
    ["random", 0.29, FAILED],
    ["random", 0.3, { ok: true }],
  ] as const)("failure %s with a draw of %d gives %j", async (failure, draw, expected) => {
    const { result } = await apply({ latency: "off", failure }, draw);

    expect(result).toEqual(expected);
  });

  test("fails only after the added latency, as a slow server would", async () => {
    const events: string[] = [];
    const result = await applyDemoControls(
      { latency: "1s", failure: "always" },
      { sleep: async () => void events.push("slept"), random: () => 0 },
    );
    events.push(result.ok ? "ok" : "failed");

    expect(events).toEqual(["slept", "failed"]);
  });
});

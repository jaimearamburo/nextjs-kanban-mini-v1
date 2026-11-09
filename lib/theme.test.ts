import { describe, expect, it } from "vitest";
import { readTheme } from "./theme";

describe("readTheme", () => {
  it("follows the OS when there is no saved choice", () => {
    expect(readTheme("", true)).toEqual({ choice: "system", theme: "dark" });
    expect(readTheme("", false)).toEqual({ choice: "system", theme: "light" });
  });

  it("lets a saved choice override the OS", () => {
    expect(readTheme("theme=light", true)).toEqual({ choice: "light", theme: "light" });
    expect(readTheme("theme=dark", false)).toEqual({ choice: "dark", theme: "dark" });
  });

  it("finds the choice among other cookies", () => {
    expect(readTheme("guest=abc; theme=dark; demo=1", false).choice).toBe("dark");
  });

  it("ignores other cookies whose names end in theme", () => {
    expect(readTheme("old-theme=dark", false)).toEqual({ choice: "system", theme: "light" });
  });

  it("treats an unknown value as no saved choice", () => {
    expect(readTheme("theme=purple", true)).toEqual({ choice: "system", theme: "dark" });
  });
});

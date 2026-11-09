export type ThemeChoice = "light" | "dark" | "system";
export type Theme = "light" | "dark";
export type ThemeState = { choice: ThemeChoice; theme: Theme };

export const OS_DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * The saved choice and the theme it comes to, from `document.cookie` and the
 * OS preference. No saved choice means System.
 *
 * Inlined into the `<head>` script by source text, so it must stay
 * self-contained: no imports and no references to this module.
 */
export function readTheme(cookie: string, osPrefersDark: boolean): ThemeState {
  const saved = /(?:^|;\s*)theme=(light|dark)(?:;|$)/.exec(cookie)?.[1] as Theme | undefined;
  return {
    choice: saved ?? "system",
    theme: saved ?? (osPrefersDark ? "dark" : "light"),
  };
}

/** Puts a theme on `<html>`. Inlined like `readTheme`, so also self-contained. */
export function applyTheme(root: HTMLElement, state: ThemeState) {
  root.classList.toggle("dark", state.theme === "dark");
  root.dataset.themeChoice = state.choice;
}

/**
 * Runs in `<head>` before first paint. The cookie is read here and not with
 * `cookies()` in the root layout, which would cost the Board its static shell.
 */
export const themeInitScript = `try{(${applyTheme})(document.documentElement,(${readTheme})(document.cookie,matchMedia(${JSON.stringify(OS_DARK_QUERY)}).matches))}catch(e){}`;

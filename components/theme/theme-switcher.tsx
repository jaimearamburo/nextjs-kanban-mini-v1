"use client";

import { useLayoutEffect } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import type { ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { chooseTheme, paintTheme, useThemeChoice } from "./theme-store";

// The highlight comes from the attribute the <head> script sets, not from
// React state, so the right button is lit before hydration too.
const OPTIONS = [
  { choice: "light", name: "Light", Icon: SunIcon, selectedClasses: "in-data-[theme-choice=light]:bg-accent in-data-[theme-choice=light]:text-accent-foreground" },
  { choice: "dark", name: "Dark", Icon: MoonIcon, selectedClasses: "in-data-[theme-choice=dark]:bg-accent in-data-[theme-choice=dark]:text-accent-foreground" },
  { choice: "system", name: "System", Icon: MonitorIcon, selectedClasses: "in-data-[theme-choice=system]:bg-accent in-data-[theme-choice=system]:text-accent-foreground" },
] as const satisfies readonly { choice: ThemeChoice; name: string; Icon: unknown; selectedClasses: string }[];

/** Picks the theme: Light, Dark, or System to follow the OS. */
export function ThemeSwitcher() {
  const current = useThemeChoice();

  // React's dev-only Strict Mode remount clears what the <head> script set on
  // <html>. A no-op in production.
  useLayoutEffect(paintTheme, []);

  return (
    <div role="group" aria-label="Theme" className="flex items-center rounded-md border p-0.5">
      {OPTIONS.map(({ choice, name, Icon, selectedClasses }) => (
        <button
          key={choice}
          type="button"
          aria-label={name}
          aria-pressed={current === choice}
          title={name}
          onClick={() => chooseTheme(choice)}
          className={cn(
            "inline-flex size-6 cursor-pointer items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
            selectedClasses,
          )}
        >
          <Icon aria-hidden className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, OS_DARK_QUERY, readTheme, type ThemeChoice } from "@/lib/theme";

const listeners = new Set<() => void>();

let osDark: MediaQueryList | undefined;

function getOsDark() {
  return (osDark ??= matchMedia(OS_DARK_QUERY));
}

function current() {
  return readTheme(document.cookie, getOsDark().matches);
}

/** Puts the current theme on `<html>` with transitions off, so every surface snaps at once. */
export function paintTheme() {
  const noTransitions = document.createElement("style");
  noTransitions.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.append(noTransitions);
  applyTheme(document.documentElement, current());
  // Forces the new colours to resolve while transitions are still off.
  void getComputedStyle(document.body).color;
  noTransitions.remove();
}

function repaintAndNotify() {
  paintTheme();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) getOsDark().addEventListener("change", repaintAndNotify);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) getOsDark().removeEventListener("change", repaintAndNotify);
  };
}

/** Saves a choice, or clears the saved one for System, and applies it. */
export function chooseTheme(choice: ThemeChoice) {
  document.cookie =
    choice === "system"
      ? "theme=; path=/; max-age=0; SameSite=Lax"
      : `theme=${choice}; path=/; max-age=31536000; SameSite=Lax`;
  repaintAndNotify();
}

export function useThemeChoice() {
  return useSyncExternalStore(subscribe, () => current().choice, () => "system" as const);
}

/** The theme in effect. Before hydration this is a default, so only use it for what isn't painted yet. */
export function useTheme() {
  return useSyncExternalStore(subscribe, () => current().theme, () => "light" as const);
}

// Colour tokens stored on Labels, Team Members and Guests, mapped to classes.
// Full class names are spelled out so Tailwind can find them.

const labelColors: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/25",
  green:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
  red: "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/25",
  purple:
    "bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/25",
  amber:
    "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25",
  slate:
    "bg-slate-100 text-slate-700 ring-slate-600/15 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/25",
};

const avatarColors: Record<string, string> = {
  violet: "bg-violet-600 text-white",
  emerald: "bg-emerald-600 text-white",
  rose: "bg-rose-600 text-white",
  sky: "bg-sky-600 text-white",
  orange: "bg-orange-600 text-white",
  teal: "bg-teal-600 text-white",
};

export function labelColorClass(color: string): string {
  return labelColors[color] ?? labelColors.slate;
}

export function avatarColorClass(color: string): string {
  return avatarColors[color] ?? "bg-muted-foreground text-background";
}

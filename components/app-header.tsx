import { Suspense } from "react";
import { DemoControls } from "@/components/demo/demo-controls";
import { DemoControlsSkeleton } from "@/components/demo/demo-controls-skeleton";
import { CurrentGuest } from "@/components/guest/current-guest";
import { GuestSkeleton } from "@/components/guest/guest-skeleton";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

/** The app's header: brand, theme switcher, demo controls and the visitor's Guest. */
export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
      <div
        aria-hidden
        className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
      >
        KM
      </div>
      <p className="sr-only text-sm font-semibold sm:not-sr-only">Kanban Mini</p>
      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitcher />
        <Suspense fallback={<DemoControlsSkeleton />}>
          <DemoControls />
        </Suspense>
        <Suspense fallback={<GuestSkeleton />}>
          <CurrentGuest />
        </Suspense>
      </div>
    </header>
  );
}

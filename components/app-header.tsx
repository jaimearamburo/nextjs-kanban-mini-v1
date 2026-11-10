import { Suspense } from "react";
import Link from "next/link";
import { DemoControls } from "@/components/demo/demo-controls";
import { DemoControlsSkeleton } from "@/components/demo/demo-controls-skeleton";
import { CurrentGuest } from "@/components/guest/current-guest";
import { GuestSkeleton } from "@/components/guest/guest-skeleton";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

/** The app's header: brand, theme switcher, demo controls and the visitor's Guest. */
export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
      {/* The brand goes home to the Board. Its name is the link's accessible
          name; on phones only the KM mark shows. */}
      <Link
        href="/"
        // On touch, a 40px tap target around the 28px mark, its negative
        // margin keeping the header as it is.
        className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:-m-1.5 pointer-coarse:p-1.5"
      >
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
        >
          KM
        </span>
        <span className="sr-only text-sm font-semibold sm:not-sr-only">Kanban Mini</span>
      </Link>
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

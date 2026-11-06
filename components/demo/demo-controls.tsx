import { getDemoSettings } from "@/lib/demo";
import { DemoControlsPopover } from "./demo-controls-popover";

/** Reads the demo-controls cookie, so it must render inside Suspense. */
export async function DemoControls() {
  return <DemoControlsPopover settings={await getDemoSettings()} />;
}

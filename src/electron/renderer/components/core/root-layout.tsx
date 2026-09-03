import { Outlet } from "@tanstack/react-router";

import { ThemeProvider } from "@/electron/renderer/components/providers/theme-provider.tsx";
import { TooltipProvider } from "@/electron/renderer/components/ui/tooltip.tsx";
import { DungeonRunProvider } from "@/electron/renderer/stores/dungeon-run-store/dungeon-run-provider";
import { LiveSplitProvider } from "@/electron/renderer/stores/live-split/live-split-store";
import { TrackingProvider } from "@/electron/renderer/stores/tracking-store/tracking-store.tsx";

export function RootLayout() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <TrackingProvider>
          <LiveSplitProvider>
            <DungeonRunProvider>
              <Outlet />
            </DungeonRunProvider>
          </LiveSplitProvider>
        </TrackingProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

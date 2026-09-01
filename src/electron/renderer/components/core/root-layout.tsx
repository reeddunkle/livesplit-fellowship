import { Outlet } from "@tanstack/react-router";

import { ThemeProvider } from "@/electron/renderer/components/providers/theme-provider.tsx";
import { TooltipProvider } from "@/electron/renderer/components/ui/tooltip.tsx";
import { DungeonRunEventProvider } from "@/electron/renderer/stores/dungeon-run-event-store/dungeon-run-event-provider";
import { LiveSplitProvider } from "@/electron/renderer/stores/live-split/live-split-store";
import { TrackingProvider } from "@/electron/renderer/stores/tracking-store/tracking-store.tsx";

export function RootLayout() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <TrackingProvider>
          <LiveSplitProvider>
            <DungeonRunEventProvider>
              <Outlet />
            </DungeonRunEventProvider>
          </LiveSplitProvider>
        </TrackingProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

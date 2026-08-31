import { Outlet } from "@tanstack/react-router";

import { ThemeProvider } from "@/electron/renderer/components/providers/theme-provider.tsx";
import { TooltipProvider } from "@/electron/renderer/components/ui/tooltip.tsx";
import { TrackingProvider } from "@/electron/renderer/stores/tracking-store/tracking-store.tsx";

export function RootLayout() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <TrackingProvider>
          <Outlet />
        </TrackingProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

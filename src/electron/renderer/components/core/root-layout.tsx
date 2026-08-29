import { Outlet } from "@tanstack/react-router";

import { ThemeProvider } from "@/electron/renderer/components/providers/theme-provider.tsx";
import { TooltipProvider } from "@/electron/renderer/components/ui/tooltip.tsx";

export function RootLayout() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <Outlet />
      </TooltipProvider>
    </ThemeProvider>
  );
}

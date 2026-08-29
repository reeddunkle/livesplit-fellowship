import { Outlet } from "@tanstack/react-router";

import { AppHeader } from "@/electron/renderer/components/core/app-header.tsx";
import { ThemeProvider } from "@/electron/renderer/components/providers/theme-provider.tsx";
import { TooltipProvider } from "@/electron/renderer/components/ui/tooltip";

export function RootLayout() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider>
        <div className="min-h-screen">
          <AppHeader />
          <Outlet />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

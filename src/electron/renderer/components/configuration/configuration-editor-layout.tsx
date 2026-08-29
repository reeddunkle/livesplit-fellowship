import { Outlet } from "@tanstack/react-router";

import { ConfigurationEditorSidebar } from "@/electron/renderer/components/configuration/configuration-editor-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/electron/renderer/components/ui/sidebar.tsx";

export function ConfigurationEditorLayout() {
  return (
    <SidebarProvider>
      <ConfigurationEditorSidebar />
      <SidebarInset>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center border-b px-4">
            <SidebarTrigger />
          </div>

          <div className="min-h-0 flex-1">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

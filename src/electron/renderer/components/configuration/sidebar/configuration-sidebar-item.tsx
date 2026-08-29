import { FileTextIcon } from "lucide-react";

import {
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/electron/renderer/components/ui/sidebar.tsx";
import { formatLocalDateTime } from "@/electron/renderer/util/format-date-time.ts";
import { type ConfigurationApiConfiguration } from "@/services/api/configuration/configuration-api-schema.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

import { ConfigurationSidebarItemActions } from "./configuration-sidebar-item-actions.tsx";

type ConfigurationSidebarItemProps = {
  readonly configuration: ConfigurationApiConfiguration;
  readonly isActive: boolean;
  readonly onDelete: (id: ConfigurationId) => void;
  readonly onSelect: (id: ConfigurationId) => void;
};

export function ConfigurationSidebarItem({
  configuration,
  isActive,
  onDelete,
  onSelect,
}: ConfigurationSidebarItemProps) {
  return (
    <SidebarMenuSubItem>
      <div
        className="flex items-stretch overflow-hidden rounded-md border border-sidebar-border/60 bg-sidebar-accent/20 transition-colors data-[active=true]:border-sidebar-accent-foreground/20 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"
        data-active={isActive}
      >
        <SidebarMenuSubButton
          className="h-auto min-w-0 flex-1 flex-col items-stretch gap-0.5 rounded-r-none p-2 text-left hover:bg-transparent active:bg-transparent"
          render={<button type="button" />}
          onClick={() => {
            onSelect(configuration.id);
          }}
        >
          <span className="flex min-w-0 items-center gap-2">
            <FileTextIcon />
            <span className="min-w-0 flex-1 truncate">
              {configuration.label}
            </span>
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {formatLocalDateTime(configuration.updatedAt)}
          </span>
        </SidebarMenuSubButton>
        <ConfigurationSidebarItemActions
          configuration={configuration}
          onDelete={onDelete}
          isActive={isActive}
        />
      </div>
    </SidebarMenuSubItem>
  );
}

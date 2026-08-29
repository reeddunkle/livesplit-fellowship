import { EllipsisVerticalIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/electron/renderer/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/electron/renderer/components/ui/popover.tsx";
import { Separator } from "@/electron/renderer/components/ui/separator";
import { formatLocalDateTime } from "@/electron/renderer/util/format-date-time";
import { type ConfigurationApiConfiguration } from "@/services/api/configuration/configuration-api-schema";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

type ConfigurationSidebarItemActionsProps = {
  readonly configuration: ConfigurationApiConfiguration;
  readonly onDelete: (id: ConfigurationId) => void;
};

export function ConfigurationSidebarItemActions({
  configuration,
  onDelete,
}: ConfigurationSidebarItemActionsProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label={`Actions for ${configuration.label}`}
            className="h-full rounded-l-none"
            size="icon-xs"
            type="button"
            variant="ghost"
          />
        }
      >
        <EllipsisVerticalIcon />
      </PopoverTrigger>
      <PopoverContent align="end">
        <PopoverHeader>
          <PopoverTitle>{configuration.label}</PopoverTitle>
          <PopoverDescription>
            Last updated: {formatLocalDateTime(configuration.updatedAt)}
          </PopoverDescription>
        </PopoverHeader>
        <Separator />
        <Button
          className="w-full justify-start"
          type="button"
          variant="destructive"
          onClick={() => {
            onDelete(configuration.id);
          }}
        >
          <Trash2Icon />
          Delete
        </Button>
      </PopoverContent>
    </Popover>
  );
}

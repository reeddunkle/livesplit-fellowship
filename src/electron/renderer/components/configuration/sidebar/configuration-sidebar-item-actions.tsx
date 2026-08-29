import { EllipsisVerticalIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/electron/renderer/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/electron/renderer/components/ui/popover.tsx";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

type ConfigurationSidebarItemActionsProps = {
  readonly configurationId: ConfigurationId;
  readonly configurationLabel: string;
  readonly onDelete: (id: ConfigurationId) => void;
};

export function ConfigurationSidebarItemActions({
  configurationId,
  configurationLabel,
  onDelete,
}: ConfigurationSidebarItemActionsProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label={`Actions for ${configurationLabel}`}
            className="h-full rounded-l-none"
            size="icon-xs"
            type="button"
            variant="ghost"
          />
        }
      >
        <EllipsisVerticalIcon />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1">
        <Button
          className="w-full justify-start"
          type="button"
          variant="destructive"
          onClick={() => {
            onDelete(configurationId);
          }}
        >
          <Trash2Icon />
          Delete
        </Button>
      </PopoverContent>
    </Popover>
  );
}

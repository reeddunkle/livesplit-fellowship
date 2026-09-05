import * as A from "effect/Array";

import {
  COMPARISON_OPTIONS,
  type DungeonRunComparison,
} from "@/electron/renderer/components/dungeon-run/dungeon-run-time.ts";
import { useDetachedWindow } from "@/electron/renderer/components/providers/detached-window-provider.tsx";
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/electron/renderer/components/ui/dropdown-menu.tsx";
import { Label } from "@/electron/renderer/components/ui/label.tsx";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/electron/renderer/components/ui/radio-group.tsx";

type DungeonRunDropdownMenuProps = {
  comparison: DungeonRunComparison;
  setComparison: (comparison: DungeonRunComparison) => void;
};

export function DungeonRunDropdownMenu({
  comparison,
  setComparison,
}: DungeonRunDropdownMenuProps) {
  const { portalContainer } = useDetachedWindow();
  return (
    <DropdownMenuContent container={portalContainer}>
      <DropdownMenuItem>
        <RadioGroup
          className="mt-1 flex w-full flex-wrap items-center gap-x-3 gap-y-2"
          onValueChange={(value) => {
            setComparison(value as DungeonRunComparison);
          }}
          value={comparison}
        >
          {A.map(COMPARISON_OPTIONS, (option) => {
            return (
              <div className="flex items-center gap-1.5" key={option.value}>
                <RadioGroupItem
                  id={`comparison-${option.value}`}
                  value={option.value}
                />
                <Label
                  className="cursor-pointer text-xs font-normal"
                  htmlFor={`comparison-${option.value}`}
                >
                  {option.label}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

import { AlertTriangleIcon, CirclePlusIcon } from "lucide-react";

import { type ConfigurationSaveState } from "./helpers/configuration-save-state";

export function ConfigurationSaveStateIndicator({
  saveState,
}: {
  readonly saveState: ConfigurationSaveState;
}) {
  if (saveState.type === "UPDATE") {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
        <AlertTriangleIcon className="size-4 shrink-0" />

        <span>
          Saving will update the existing configuration "{saveState.label}".
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
      <CirclePlusIcon className="size-4 shrink-0" />

      <span>Saving will create a new configuration.</span>
    </div>
  );
}

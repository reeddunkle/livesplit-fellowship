import { type ConfigurationSaveState } from "./configuration-save-state";

export function ConfigurationSaveStateIndicator({
  saveState,
}: {
  readonly saveState: ConfigurationSaveState;
}) {
  if (saveState.type === "UPDATE") {
    return (
      <span className="text-sm text-amber-600 dark:text-amber-400">
        Matches existing Configuration "{saveState.label}"
      </span>
    );
  }

  return (
    <span className="text-sm text-green-600 dark:text-green-400">
      Creates a new configuration
    </span>
  );
}

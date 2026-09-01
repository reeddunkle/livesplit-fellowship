import { PlayIcon, SquareIcon } from "lucide-react";

import { Button } from "@/electron/renderer/components/ui/button.tsx";
import { Spinner } from "@/electron/renderer/components/ui/spinner.tsx";
import {
  useConfigurationById,
  useSelectedConfiguration,
  useSelectedConfigurationId,
} from "@/electron/renderer/stores/configurations-store/configurations-store.tsx";
import {
  useTrackingActionState,
  useTrackingActions,
  useTrackingServerState,
} from "@/electron/renderer/stores/tracking-store/tracking-store.tsx";

export function HomeTrackingControls() {
  const selectedConfiguration = useSelectedConfiguration();
  const selectedConfigurationId = useSelectedConfigurationId();

  const { start, stop } = useTrackingActions();
  const { isPending } = useTrackingActionState();
  const { trackingStatus } = useTrackingServerState();

  const isTracking = trackingStatus?.status === "Tracking";

  const trackingConfigurationId =
    trackingStatus?.status === "Tracking" &&
    trackingStatus.source.type === "Persisted"
      ? trackingStatus.source.configurationId
      : null;

  const trackingConfiguration = useConfigurationById(trackingConfigurationId);

  const configurationLabel = isTracking
    ? trackingConfiguration?.label
    : selectedConfiguration?.label;

  return (
    <section className="flex flex-col items-end gap-3">
      <div className="flex gap-3">
        <Button
          className="min-w-32 bg-green-600 text-white hover:bg-green-700"
          disabled={selectedConfigurationId === null || isTracking || isPending}
          size="xl"
          type="button"
          onClick={() => {
            if (selectedConfigurationId === null) {
              return;
            }

            start(selectedConfigurationId);
          }}
        >
          {isTracking ? (
            <>
              <Spinner className="size-6" />
              {"Tracking"}
            </>
          ) : (
            <>
              <PlayIcon className="fill-current" />
              {"Start"}
            </>
          )}
        </Button>

        <Button
          className="min-w-32"
          disabled={!isTracking || isPending}
          size="xl"
          type="button"
          variant="destructive"
          onClick={stop}
        >
          <SquareIcon className="fill-current" />
          {"Stop"}
        </Button>
      </div>

      {configurationLabel !== undefined && (
        <p
          className={
            isTracking
              ? "flex items-center gap-2 text-sm text-muted-foreground/60"
              : "text-sm text-muted-foreground"
          }
        >
          {isTracking
            ? `Tracking "${configurationLabel}"`
            : `Start tracking a dungeon run using "${configurationLabel}"`}
        </p>
      )}

      {selectedConfigurationId === null && !isTracking && (
        <p className="text-sm text-muted-foreground">
          Save the configuration before starting a run.
        </p>
      )}
    </section>
  );
}

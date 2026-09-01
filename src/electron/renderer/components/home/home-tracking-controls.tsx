import { PlayIcon, SquareIcon } from "lucide-react";

import { Button } from "@/electron/renderer/components/ui/button.tsx";
import { useSelectedConfigurationId } from "@/electron/renderer/stores/configurations-store/configurations-store.tsx";
import {
  useTrackingActionState,
  useTrackingActions,
  useTrackingServerState,
} from "@/electron/renderer/stores/tracking-store/tracking-store.tsx";

export function HomeTrackingControls() {
  const selectedConfigurationId = useSelectedConfigurationId();

  const { start, stop } = useTrackingActions();
  const { isStarting, isStopping } = useTrackingActionState();
  const { trackingStatus } = useTrackingServerState();

  const isTracking = trackingStatus?.status === "Tracking";

  return (
    <section className="flex flex-col items-end gap-3">
      <div className="flex gap-3">
        <Button
          className="min-w-32 bg-green-600 text-white hover:bg-green-700"
          disabled={
            selectedConfigurationId === null ||
            isTracking ||
            isStarting ||
            isStopping
          }
          size="xl"
          type="button"
          onClick={() => {
            if (selectedConfigurationId === null) {
              return;
            }

            start(selectedConfigurationId);
          }}
        >
          <PlayIcon />
          {isStarting ? "Starting..." : "Start"}
        </Button>

        <Button
          className="min-w-32"
          disabled={!isTracking || isStarting || isStopping}
          size="xl"
          type="button"
          variant="destructive"
          onClick={stop}
        >
          <SquareIcon />
          {isStopping ? "Stopping..." : "Stop"}
        </Button>
      </div>

      {selectedConfigurationId === null && (
        <p className="text-sm text-muted-foreground">
          Save the configuration before starting a run.
        </p>
      )}
    </section>
  );
}

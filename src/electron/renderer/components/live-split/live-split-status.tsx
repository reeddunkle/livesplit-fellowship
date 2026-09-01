import { CircleIcon } from "lucide-react";

import { useLiveSplitServerState } from "@/electron/renderer/stores/live-split/live-split-store.tsx";

export function LiveSplitStatus() {
  const { connectionState, liveSplitStatus } = useLiveSplitServerState();

  const statusLabel = liveSplitStatus?.status ?? "Unknown";

  return (
    <div className="flex items-center gap-2">
      <CircleIcon className="size-3 fill-current" />

      <div className="flex flex-col">
        <span className="text-sm font-medium">LiveSplit</span>
        <span className="text-sm text-muted-foreground">
          {statusLabel}
          {connectionState !== "CONNECTED" && " · API disconnected"}
        </span>
      </div>
    </div>
  );
}

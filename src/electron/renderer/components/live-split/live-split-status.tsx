import { CircleIcon } from "lucide-react";

import {
  useLiveSplitActionState,
  useLiveSplitServerState,
} from "@/electron/renderer/stores/live-split/live-split-store.tsx";

function getErrorMessage(error: unknown): string {
  console.log(error);

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function LiveSplitStatus() {
  const { connectError } = useLiveSplitActionState();
  const { connectionState, liveSplitStatus } = useLiveSplitServerState();

  const isConnected = liveSplitStatus?.status === "Connected";
  const hasConnectionError = connectError !== undefined;

  const statusLabel = isConnected
    ? "Connected"
    : hasConnectionError
      ? "Connection failed"
      : (liveSplitStatus?.status ?? "Unknown");

  const circleClassName = isConnected
    ? "size-3 fill-current text-green-600"
    : hasConnectionError
      ? "size-3 fill-current text-red-600"
      : "size-3 fill-current";

  return (
    <div className="flex items-center gap-2">
      <CircleIcon className={circleClassName} />

      <div className="flex flex-col">
        <span className="text-sm font-medium">LiveSplit</span>

        <span className="text-sm text-muted-foreground">
          {statusLabel}
          {connectionState !== "CONNECTED" && " · API disconnected"}
        </span>

        {hasConnectionError && (
          <span className="text-sm text-red-600">
            {getErrorMessage(connectError)}
          </span>
        )}
      </div>
    </div>
  );
}

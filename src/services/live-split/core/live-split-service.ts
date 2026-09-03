import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Stream from "effect/Stream";

import { handleLiveSplitDungeonRunEvent } from "@/application/dungeon-run-processing/handle-live-split-dungeon-run-event.ts";
import { type LiveSplitConnectionError } from "@/errors/live-split-client-error.ts";
import { type DungeonRunProcessingEvent } from "@/services/fellowship/dungeon-runs/process-dungeon-run-event.ts";
import {
  LiveSplitConnectionManager,
  type LiveSplitConnectionStatus,
} from "@/services/live-split/core/live-split-connection-manager-service.ts";

export interface LiveSplitService {
  readonly connect: () => E.Effect<void, LiveSplitConnectionError>;

  readonly disconnect: () => E.Effect<void>;

  readonly handleRunEvent: (event: DungeonRunProcessingEvent) => E.Effect<void>;

  readonly status: E.Effect<LiveSplitConnectionStatus>;

  readonly statusChanges: Stream.Stream<LiveSplitConnectionStatus>;
}

export class LiveSplit extends Context.Service<LiveSplit, LiveSplitService>()(
  "app/LiveSplit",
) {}

const make = E.gen(function* () {
  const connectionManager = yield* LiveSplitConnectionManager;

  const handleRunEvent: LiveSplitService["handleRunEvent"] = (
    processingEvent,
  ) => {
    return handleLiveSplitDungeonRunEvent({
      processingEvent,
    }).pipe(
      E.provideService(LiveSplitConnectionManager, connectionManager),
      E.catch((error) => {
        return E.gen(function* () {
          yield* E.logError("LiveSplit failed to handle dungeon run event.", {
            error,
          });

          yield* connectionManager.disconnect();
        });
      }),
    );
  };

  return {
    connect: connectionManager.connect,
    disconnect: connectionManager.disconnect,
    handleRunEvent,
    status: connectionManager.status,
    statusChanges: connectionManager.statusChanges,
  } satisfies LiveSplitService;
});

export const LiveSplitLive = Layer.effect(LiveSplit, make);

import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { handleLiveSplitRunEvent } from "@/application/run-processing/handle-live-split-run-event.ts";
import { type LiveSplitConnectionError } from "@/errors/live-split-client-error.ts";
import {
  LiveSplitConnectionManager,
  type LiveSplitConnectionStatus,
} from "@/services/live-split/core/live-split-connection-manager-service.ts";

type LiveSplitRunEvent = Parameters<typeof handleLiveSplitRunEvent>[0]["event"];

export interface LiveSplitService {
  readonly connect: () => E.Effect<void, LiveSplitConnectionError>;

  readonly disconnect: () => E.Effect<void>;

  readonly handleRunEvent: (event: LiveSplitRunEvent) => E.Effect<void>;

  readonly status: E.Effect<LiveSplitConnectionStatus>;
}

export class LiveSplit extends Context.Service<LiveSplit, LiveSplitService>()(
  "app/LiveSplit",
) {}

const make = E.gen(function* () {
  const connectionManager = yield* LiveSplitConnectionManager;

  const handleRunEvent: LiveSplitService["handleRunEvent"] = (event) => {
    return E.gen(function* () {
      const client = yield* connectionManager.client;

      if (Option.isNone(client)) {
        return;
      }

      yield* handleLiveSplitRunEvent({
        event,
        liveSplitClient: client.value,
      }).pipe(
        E.catch((error) => {
          return E.gen(function* () {
            yield* E.logError("LiveSplit failed to handle run event.", {
              error,
            });

            yield* connectionManager.disconnect();
          });
        }),
      );
    });
  };

  return {
    connect: connectionManager.connect,
    disconnect: connectionManager.disconnect,
    handleRunEvent,
    status: connectionManager.status,
  } satisfies LiveSplitService;
});

export const LiveSplitLive = Layer.effect(LiveSplit, make);

import * as E from "effect/Effect";
import * as Match from "effect/Match";
import * as Option from "effect/Option";

import {
  DUNGEON_RUN_PROCESSING_EVENT,
  type DungeonRunProcessingEvent,
} from "@/services/fellowship/dungeon-runs/process-dungeon-run-event.ts";
import { LiveSplitConnectionManager } from "@/services/live-split/core/live-split-connection-manager-service.ts";

type HandleLiveSplitDungeonRunEventOptions = {
  readonly processingEvent: DungeonRunProcessingEvent;
};

export const handleLiveSplitDungeonRunEvent = E.fn(
  "live-split.handle-dungeon-run-event",
)(function* ({ processingEvent }: HandleLiveSplitDungeonRunEventOptions) {
  const connectionManager = yield* LiveSplitConnectionManager;

  const client = yield* connectionManager.client;

  if (Option.isNone(client)) {
    return;
  }

  yield* Match.value(processingEvent).pipe(
    Match.when(
      {
        type: DUNGEON_RUN_PROCESSING_EVENT.RUN_STARTED,
      },
      () => {
        return E.gen(function* () {
          yield* client.value.reset();
          yield* client.value.startTimer();
        });
      },
    ),
    Match.when(
      {
        type: DUNGEON_RUN_PROCESSING_EVENT.REQUIREMENT_SATISFIED,
      },
      () => {
        return E.void;
      },
    ),
    Match.when(
      {
        type: DUNGEON_RUN_PROCESSING_EVENT.MILESTONE_COMPLETED,
      },
      () => {
        return client.value.split();
      },
    ),
    Match.when(
      {
        type: DUNGEON_RUN_PROCESSING_EVENT.RUN_COMPLETED,
      },
      () => {
        return client.value.pause();
      },
    ),
    Match.when(
      {
        type: DUNGEON_RUN_PROCESSING_EVENT.RUN_EXITED,
      },
      () => {
        return client.value.pause();
      },
    ),
    Match.exhaustive,
  );
});

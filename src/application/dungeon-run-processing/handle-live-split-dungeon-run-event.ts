import * as E from "effect/Effect";
import * as Match from "effect/Match";

import {
  DUNGEON_RUN_PROCESSING_EVENT,
  type DungeonRunProcessingEvent,
} from "@/services/fellowship/dungeon-runs/process-dungeon-run-event.ts";
import { LiveSplitClientService } from "@/services/live-split/core/live-split-client-service.ts";

export const handleLiveSplitDungeonRunEvent = E.fn(
  "handleLiveSplitDungeonRunEvent",
)(function* (processingEvent: DungeonRunProcessingEvent) {
  const liveSplitClient = yield* LiveSplitClientService;

  return Match.value(processingEvent).pipe(
    Match.when({ type: DUNGEON_RUN_PROCESSING_EVENT.RUN_STARTED }, () => {
      return E.gen(function* () {
        yield* liveSplitClient.reset();
        yield* liveSplitClient.startTimer();
      });
    }),
    Match.when({ type: DUNGEON_RUN_PROCESSING_EVENT.RUN_COMPLETED }, () => {
      return E.void;
    }),
    Match.when({ type: DUNGEON_RUN_PROCESSING_EVENT.RUN_EXITED }, () => {
      return liveSplitClient.pause();
    }),
    Match.when(
      { type: DUNGEON_RUN_PROCESSING_EVENT.MILESTONE_COMPLETED },
      () => {
        return liveSplitClient.split();
      },
    ),
  );
});

import * as E from "effect/Effect";
import * as Match from "effect/Match";

import {
  RUN_PROCESSING_EVENT,
  type RunProcessingEvent,
} from "@/services/fellowship/dungeon-runs/process-run-event.ts";
import { type LiveSplitClientService } from "@/services/live-split/core/live-split-client-service.ts";

export function handleLiveSplitRunEvent({
  event,
  liveSplitClient,
}: {
  readonly event: RunProcessingEvent;
  readonly liveSplitClient: LiveSplitClientService;
}) {
  return Match.value(event).pipe(
    Match.when({ type: RUN_PROCESSING_EVENT.RUN_STARTED }, () => {
      return E.gen(function* () {
        yield* liveSplitClient.reset();
        yield* liveSplitClient.startTimer();
      });
    }),
    Match.when({ type: RUN_PROCESSING_EVENT.RUN_EXITED }, () => {
      return liveSplitClient.pause();
    }),
    Match.when({ type: RUN_PROCESSING_EVENT.MILESTONE_COMPLETED }, () => {
      return liveSplitClient.split();
    }),
    Match.exhaustive,
  );
}

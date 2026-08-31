import * as E from "effect/Effect";
import * as Match from "effect/Match";

import {
  RUN_PROCESSING_EVENT,
  type RunProcessingEvent,
} from "@/services/fellowship/runs/process-run-event.ts";
import { type LiveSplitClient } from "@/services/live-split/core/live-split-client-service.ts";

export function handleLiveSplitRunEvent({
  event,
  liveSplitClient,
}: {
  readonly event: RunProcessingEvent;
  readonly liveSplitClient: LiveSplitClient["Service"];
}) {
  return Match.value(event).pipe(
    Match.when({ type: RUN_PROCESSING_EVENT.RUN_STARTED }, () =>
      E.gen(function* () {
        yield* liveSplitClient.reset();
        yield* liveSplitClient.startTimer();
      }),
    ),
    Match.when({ type: RUN_PROCESSING_EVENT.RUN_EXITED }, () =>
      liveSplitClient.pause(),
    ),
    Match.when({ type: RUN_PROCESSING_EVENT.MILESTONE_COMPLETED }, () =>
      liveSplitClient.split(),
    ),
    Match.exhaustive,
  );
}

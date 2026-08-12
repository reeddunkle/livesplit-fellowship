import * as E from "effect/Effect";

import {
  RUN_PROCESSING_EVENT,
  type RunProcessingEvent,
} from "@/services/fellowship/runs/process-run-event.ts";
import { type LiveSplitClient } from "@/services/live-split/client/live-split-client-service.ts";

export function handleLiveSplitRunEvent({
  event,
  liveSplitClient,
}: {
  readonly event: RunProcessingEvent;
  readonly liveSplitClient: LiveSplitClient["Service"];
}) {
  switch (event.type) {
    case RUN_PROCESSING_EVENT.RUN_STARTED:
      return E.gen(function* () {
        yield* liveSplitClient.reset();
        yield* liveSplitClient.startTimer();
      });

    case RUN_PROCESSING_EVENT.RUN_EXITED:
      return liveSplitClient.pause();

    case RUN_PROCESSING_EVENT.MILESTONE_COMPLETED:
      return liveSplitClient.split();
  }
}

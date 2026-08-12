import * as E from "effect/Effect";
import * as Match from "effect/Match";

import {
  RUN_PROCESSING_EVENT,
  type RunProcessingEvent,
} from "@/services/fellowship/runs/process-run-event.ts";

export function handleLogRunEvent(event: RunProcessingEvent): E.Effect<void> {
  return Match.value(event).pipe(
    Match.when({ type: RUN_PROCESSING_EVENT.RUN_STARTED }, () =>
      E.logInfo("Run started."),
    ),
    Match.when({ type: RUN_PROCESSING_EVENT.RUN_EXITED }, () =>
      E.logInfo("Run exited."),
    ),
    Match.when(
      { type: RUN_PROCESSING_EVENT.MILESTONE_COMPLETED },
      ({ milestone }) =>
        E.logInfo("Milestone completed.", {
          elapsedMilliseconds: milestone.elapsedMilliseconds,
          label: milestone.label,
          milestoneId: milestone.milestoneId,
        }),
    ),
    Match.exhaustive,
  );
}

import * as E from "effect/Effect";

import {
  RUN_PROCESSING_EVENT,
  type RunProcessingEvent,
} from "@/services/fellowship/runs/process-run-event.ts";

export function handleLogRunEvent(event: RunProcessingEvent): E.Effect<void> {
  switch (event.type) {
    case RUN_PROCESSING_EVENT.RUN_STARTED:
      return E.logInfo("Run started.");

    case RUN_PROCESSING_EVENT.RUN_EXITED:
      return E.logInfo("Run exited.");

    case RUN_PROCESSING_EVENT.MILESTONE_COMPLETED:
      return E.logInfo("Milestone completed.", {
        elapsedMilliseconds: event.milestone.elapsedMilliseconds,
        label: event.milestone.label,
        milestoneId: event.milestone.milestoneId,
      });
  }
}

import * as E from "effect/Effect";
import * as Match from "effect/Match";

import {
  DUNGEON_RUN_PROCESSING_EVENT,
  type DungeonRunProcessingEvent,
} from "@/services/fellowship/dungeon-runs/process-dungeon-run-event.ts";

export function handleLogDungeonRunEvent(
  event: DungeonRunProcessingEvent,
): E.Effect<void> {
  return Match.value(event).pipe(
    Match.when({ type: DUNGEON_RUN_PROCESSING_EVENT.RUN_STARTED }, () =>
      E.logInfo("Run started.", {
        runEvent: DUNGEON_RUN_PROCESSING_EVENT.RUN_STARTED,
      }),
    ),
    Match.when({ type: DUNGEON_RUN_PROCESSING_EVENT.RUN_EXITED }, () =>
      E.logInfo("Run exited.", {
        runEvent: DUNGEON_RUN_PROCESSING_EVENT.RUN_EXITED,
      }),
    ),
    Match.when(
      { type: DUNGEON_RUN_PROCESSING_EVENT.MILESTONE_COMPLETED },
      ({ milestone }) =>
        E.logInfo("Milestone completed.", {
          elapsedMilliseconds: milestone.elapsedMilliseconds,
          label: milestone.label,
          milestoneId: milestone.milestoneId,
          runEvent: DUNGEON_RUN_PROCESSING_EVENT.MILESTONE_COMPLETED,
        }),
    ),
    Match.exhaustive,
  );
}

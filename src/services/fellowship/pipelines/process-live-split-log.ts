import * as E from "effect/Effect";
import * as Stream from "effect/Stream";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { Fellowship } from "@/services/fellowship/fellowship-service.ts";
import {
  createInitialLiveRunState,
  type LiveRunState,
} from "@/services/fellowship/live/live-run-state.ts";
import { processLiveEvent } from "@/services/fellowship/live/process-live-event.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { doesDungeonRunMatchConfiguration } from "@/services/fellowship/runs/does-dungeon-run-match-configuration.ts";
import { isDungeonExitEvent } from "@/services/fellowship/runs/is-dungeon-exit-event.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";
import { LiveSplitClient } from "@/services/live-split/client/live-split-client-service.ts";

export type ProcessLiveSplitLogOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
};

type ProcessLiveSplitEventOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly liveSplitClient: LiveSplitClient["Service"];
  readonly state: LiveRunState;
};

function processLiveSplitEvent({
  configuration,
  event,
  liveSplitClient,
  state,
}: ProcessLiveSplitEventOptions) {
  return E.gen(function* () {
    const currentStart = state.runTracker.currentStart;

    const isConfiguredRunActive =
      currentStart !== undefined &&
      doesDungeonRunMatchConfiguration({
        configuration,
        run: {
          start: currentStart,
        },
      });

    const hasExitedConfiguredRun =
      isConfiguredRunActive &&
      isDungeonExitEvent({
        event,
        runStart: currentStart,
      });

    if (hasExitedConfiguredRun) {
      yield* liveSplitClient.pause();

      yield* E.logInfo("Paused LiveSplit after leaving dungeon.", {
        dungeonId: currentStart.dungeonId,
        dungeonName: currentStart.dungeonName,
      });
    }

    if (event.type === FELLOWSHIP_EVENT.DUNGEON_START) {
      const matchesConfiguration = doesDungeonRunMatchConfiguration({
        configuration,
        run: {
          start: event,
        },
      });

      if (matchesConfiguration) {
        yield* liveSplitClient.reset();
        yield* liveSplitClient.startTimer();
      }
    }

    const result = processLiveEvent({
      configuration,
      event,
      state,
    });

    if (result.milestones.length > 0) {
      yield* E.logInfo("LiveSplit milestones emitted.", {
        eventType: event.type,
        milestones: result.milestones.map((milestone) => {
          return {
            label: milestone.label,
            milestoneId: milestone.milestoneId,
          };
        }),
      });
    }

    return [result.state, result.milestones] as const;
  });
}

export function processLiveSplitLog({
  configuration,
}: ProcessLiveSplitLogOptions) {
  return E.gen(function* () {
    const fellowship = yield* Fellowship;
    const liveSplitClient = yield* LiveSplitClient;

    return yield* fellowship.liveEvents().pipe(
      Stream.mapAccumEffect(createInitialLiveRunState, (state, event) => {
        return processLiveSplitEvent({
          configuration,
          event,
          liveSplitClient,
          state,
        });
      }),
      Stream.runForEach(() => {
        return liveSplitClient.split();
      }),
    );
  });
}

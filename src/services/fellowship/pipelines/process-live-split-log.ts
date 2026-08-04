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
import { doesDungeonStartMatchConfiguration } from "@/services/fellowship/runs/does-dungeon-start-match-configuration.ts";
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
    if (event.type === FELLOWSHIP_EVENT.DUNGEON_START) {
      const matchesConfiguration = doesDungeonStartMatchConfiguration({
        configuration,
        dungeonStart: event,
      });

      yield* E.logInfo("Checked dungeon start.", {
        configuredDungeonName: configuration.dungeon.name,
        configuredKeyLevel: configuration.keyLevel,
        configuredZoneId: configuration.dungeon.zoneId,
        eventDungeonName: event.dungeonName,
        eventKeyLevel: event.keyLevel,
        eventZoneId: event.zoneId,
        matchesConfiguration,
      });

      if (matchesConfiguration) {
        yield* E.logInfo("Sending LiveSplit reset command.");

        yield* liveSplitClient.reset();

        yield* E.logInfo("Sending LiveSplit starttimer command.");

        yield* liveSplitClient.startTimer();

        yield* E.logInfo("LiveSplit timer started.");
      }
    }

    const result = processLiveEvent({
      configuration,
      event,
      state,
    });

    yield* E.logInfo("Processed autosplit event.", {
      eventType: event.type,
      milestoneCount: result.milestones.length,
      milestoneIds: result.milestones.map((milestone) => milestone.milestoneId),
    });

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
      Stream.tap((event) => {
        return E.logInfo("Autosplit stream received event.", {
          eventType: event.type,
        });
      }),
      Stream.mapAccumEffect(createInitialLiveRunState, (state, event) => {
        return E.gen(function* () {
          yield* E.logInfo("Processing autosplit event.", {
            eventType: event.type,
          });

          return yield* processLiveSplitEvent({
            configuration,
            event,
            liveSplitClient,
            state,
          });
        });
      }),
      Stream.runForEach((milestone) => {
        return E.gen(function* () {
          yield* E.logInfo("Autosplit milestone emitted.", {
            label: milestone.label,
            milestoneId: milestone.milestoneId,
          });

          yield* liveSplitClient.split();

          yield* E.logInfo("LiveSplit split command completed.", {
            milestoneId: milestone.milestoneId,
          });
        });
      }),
    );
  });
}

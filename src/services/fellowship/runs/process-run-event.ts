import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { initialMilestoneProcessorState } from "@/services/fellowship/milestones/milestone-processor-state.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { processMilestoneEvent } from "@/services/fellowship/milestones/process-milestone-event.ts";
import { doesDungeonRunMatchConfiguration } from "@/services/fellowship/runs/does-dungeon-run-match-configuration.ts";
import { trackDungeonRunEvent } from "@/services/fellowship/runs/track-dungeon-run.ts";
import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

import { type RunProcessingState } from "./run-processing-state.ts";

export type ProcessRunEventOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly state: RunProcessingState;
};

export type ProcessRunEventResult = {
  readonly milestones: ReadonlyArray<FellowshipRunMilestone>;
  readonly state: RunProcessingState;
};

type GetRunStartForEventOptions = {
  readonly completedRunStart: DungeonStartEvent | undefined;
  readonly currentStart: DungeonStartEvent | undefined;
  readonly event: FellowshipEvent;
};

function getRunStartForEvent({
  completedRunStart,
  currentStart,
  event,
}: GetRunStartForEventOptions): DungeonStartEvent | undefined {
  if (event.type === FELLOWSHIP_EVENT.DUNGEON_START) {
    return event;
  }

  return completedRunStart ?? currentStart;
}

export function processRunEvent({
  configuration,
  event,
  state,
}: ProcessRunEventOptions): ProcessRunEventResult {
  const trackerResult = trackDungeonRunEvent({
    event,
    state: state.runTracker,
  });

  const isDungeonStart = event.type === FELLOWSHIP_EVENT.DUNGEON_START;

  const milestoneProcessor = isDungeonStart
    ? initialMilestoneProcessorState
    : state.milestoneProcessor;

  const runStart = getRunStartForEvent({
    completedRunStart: trackerResult.completedRun?.start,
    currentStart: state.runTracker.currentStart,
    event,
  });

  const isConfiguredRun =
    runStart !== undefined &&
    doesDungeonRunMatchConfiguration({
      configuration,
      run: {
        start: runStart,
      },
    });

  if (!isConfiguredRun) {
    return {
      milestones: [],
      state: {
        latestMilestone: isDungeonStart ? undefined : state.latestMilestone,
        milestoneProcessor,
        runTracker: trackerResult.state,
      },
    };
  }

  const milestoneResult = processMilestoneEvent({
    configuration,
    event,
    runStart,
    state: milestoneProcessor,
  });

  const completedMilestone = milestoneResult.milestones.at(-1);

  const latestMilestone = isDungeonStart
    ? completedMilestone
    : (completedMilestone ?? state.latestMilestone);

  return {
    milestones: milestoneResult.milestones,
    state: {
      latestMilestone,
      milestoneProcessor: milestoneResult.state,
      runTracker: trackerResult.state,
    },
  };
}

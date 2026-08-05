import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { initialMilestoneProcessorState } from "@/services/fellowship/milestones/milestone-processor-state.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { processMilestoneEvent } from "@/services/fellowship/milestones/process-milestone-event.ts";
import { doesDungeonRunMatchConfiguration } from "@/services/fellowship/runs/does-dungeon-run-match-configuration.ts";
import { trackDungeonRunEvent } from "@/services/fellowship/runs/track-dungeon-run.ts";
import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

import { type LiveRunState } from "./live-run-state.ts";

export type ProcessLiveEventOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly state: LiveRunState;
};

export type ProcessLiveEventResult = {
  readonly milestones: ReadonlyArray<FellowshipRunMilestone>;
  readonly state: LiveRunState;
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

export function processLiveEvent({
  configuration,
  event,
  state,
}: ProcessLiveEventOptions): ProcessLiveEventResult {
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

  const mapId =
    event.type === FELLOWSHIP_EVENT.DUNGEON_START
      ? state.runTracker.latestMapId
      : trackerResult.state.currentMapId;

  const isConfiguredRun =
    runStart !== undefined &&
    mapId !== undefined &&
    doesDungeonRunMatchConfiguration({
      configuration,
      run: {
        mapId,
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

  const latestMilestone = isDungeonStart
    ? milestoneResult.milestones.at(-1)
    : (milestoneResult.milestones.at(-1) ?? state.latestMilestone);

  return {
    milestones: milestoneResult.milestones,
    state: {
      latestMilestone,
      milestoneProcessor: milestoneResult.state,
      runTracker: trackerResult.state,
    },
  };
}

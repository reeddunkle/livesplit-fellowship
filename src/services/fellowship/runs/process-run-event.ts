import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { initialMilestoneProcessorState } from "@/services/fellowship/milestones/milestone-processor-state.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { processMilestoneEvent } from "@/services/fellowship/milestones/process-milestone-event.ts";
import { trackDungeonRunEvent } from "@/services/fellowship/runs/track-dungeon-run.ts";
import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";
import { doesDungeonRunMatchConfiguration } from "@/services/fellowship/utilities/does-dungeon-run-match-configuration.ts";
import { isDungeonExitEvent } from "@/services/fellowship/utilities/is-dungeon-exit-event.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

import { type RunProcessingState } from "./run-processing-state.ts";

export const RUN_PROCESSING_EVENT = {
  MILESTONE_COMPLETED: "MILESTONE_COMPLETED",
  RUN_EXITED: "RUN_EXITED",
  RUN_STARTED: "RUN_STARTED",
} as const;

export type RunProcessingEvent =
  | {
      readonly type: typeof RUN_PROCESSING_EVENT.RUN_STARTED;
    }
  | {
      readonly type: typeof RUN_PROCESSING_EVENT.RUN_EXITED;
    }
  | {
      readonly milestone: FellowshipRunMilestone;
      readonly type: typeof RUN_PROCESSING_EVENT.MILESTONE_COMPLETED;
    };

export type ProcessRunEventOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly state: RunProcessingState;
};

export type ProcessRunEventResult = {
  readonly events: ReadonlyArray<RunProcessingEvent>;
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
  const currentStart = state.runTracker.currentStart;

  const isConfiguredRunActive =
    currentStart !== undefined &&
    doesDungeonRunMatchConfiguration({
      configuration,
      run: {
        start: currentStart,
      },
    });

  // Order matters here
  const hasExitedConfiguredRun =
    isConfiguredRunActive &&
    isDungeonExitEvent({
      event,
      runStart: currentStart,
    });

  const trackerResult = trackDungeonRunEvent({
    event,
    state: state.runTracker,
  });
  // Order matters above

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
      events: [],
      state: {
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

  const events: RunProcessingEvent[] = [];

  if (isDungeonStart) {
    events.push({
      type: RUN_PROCESSING_EVENT.RUN_STARTED,
    });
  }

  if (hasExitedConfiguredRun) {
    events.push({
      type: RUN_PROCESSING_EVENT.RUN_EXITED,
    });
  }

  for (const milestone of milestoneResult.milestones) {
    events.push({
      milestone,
      type: RUN_PROCESSING_EVENT.MILESTONE_COMPLETED,
    });
  }

  return {
    events,
    state: {
      milestoneProcessor: milestoneResult.state,
      runTracker: trackerResult.state,
    },
  };
}

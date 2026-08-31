import type * as DateTime from "effect/DateTime";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { trackDungeonRunEvent } from "@/services/fellowship/dungeon-runs/track-dungeon-run.ts";
import { initialMilestoneProcessorState } from "@/services/fellowship/milestones/milestone-processor-state.ts";
import { type CompiledFellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { processMilestoneEvent } from "@/services/fellowship/milestones/process-milestone-event.ts";
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
      readonly timestamp: DateTime.Utc;
      readonly type: typeof RUN_PROCESSING_EVENT.RUN_STARTED;
    }
  | {
      readonly timestamp: DateTime.Utc;
      readonly type: typeof RUN_PROCESSING_EVENT.RUN_EXITED;
    }
  | {
      readonly milestone: FellowshipRunMilestone;
      readonly type: typeof RUN_PROCESSING_EVENT.MILESTONE_COMPLETED;
    };

export type ProcessRunEventOptions = {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly state: RunProcessingState;
};

export type ProcessRunEventResult = {
  readonly events: ReadonlyArray<RunProcessingEvent>;
  readonly isStateUpdated: boolean;
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

function doesRunStartMatchConfiguration({
  configuration,
  runStart,
}: {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly runStart: DungeonStartEvent;
}): boolean {
  return doesDungeonRunMatchConfiguration({
    configuration,
    run: {
      start: runStart,
    },
  });
}

function getEventTimestamp(event: FellowshipEvent): DateTime.Utc {
  return event.type === FELLOWSHIP_EVENT.DUNGEON_START
    ? event.startedAt
    : event.timestamp;
}

export function processRunEvent({
  configuration,
  event,
  state,
}: ProcessRunEventOptions): ProcessRunEventResult {
  const isDungeonStart = event.type === FELLOWSHIP_EVENT.DUNGEON_START;

  const isConfiguredDungeonStart =
    isDungeonStart &&
    doesRunStartMatchConfiguration({
      configuration,
      runStart: event,
    });

  const currentRunStart = state.runTracker.currentStart;

  const wasConfiguredRunActive =
    currentRunStart !== undefined &&
    doesRunStartMatchConfiguration({
      configuration,
      runStart: currentRunStart,
    });

  const hasExitedConfiguredRun =
    wasConfiguredRunActive &&
    isDungeonExitEvent({
      event,
      runStart: currentRunStart,
    });

  const trackerResult = trackDungeonRunEvent({
    event,
    state: state.runTracker,
  });

  const milestoneProcessor = isConfiguredDungeonStart
    ? initialMilestoneProcessorState
    : state.milestoneProcessor;

  const runStart = getRunStartForEvent({
    completedRunStart: trackerResult.completedRun?.start,
    currentStart: state.runTracker.currentStart,
    event,
  });

  if (
    runStart === undefined ||
    !doesRunStartMatchConfiguration({
      configuration,
      runStart,
    })
  ) {
    return {
      events: [],
      isStateUpdated: false,
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

  const timestamp = getEventTimestamp(event);

  const dungeonStartEvents: ReadonlyArray<RunProcessingEvent> =
    isConfiguredDungeonStart
      ? [
          {
            timestamp,
            type: RUN_PROCESSING_EVENT.RUN_STARTED,
          },
        ]
      : [];

  const milestoneEvents: ReadonlyArray<RunProcessingEvent> =
    milestoneResult.milestones.map((milestone) => {
      return {
        milestone,
        type: RUN_PROCESSING_EVENT.MILESTONE_COMPLETED,
      };
    });

  const dungeonExitEvents: ReadonlyArray<RunProcessingEvent> =
    hasExitedConfiguredRun
      ? [
          {
            timestamp,
            type: RUN_PROCESSING_EVENT.RUN_EXITED,
          },
        ]
      : [];

  const isStateUpdated =
    isConfiguredDungeonStart ||
    milestoneResult.isStateUpdated ||
    hasExitedConfiguredRun;

  return {
    events: [...dungeonStartEvents, ...milestoneEvents, ...dungeonExitEvents],
    isStateUpdated,
    state: {
      milestoneProcessor: milestoneResult.state,
      runTracker: trackerResult.state,
    },
  };
}

import type * as DateTime from "effect/DateTime";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { trackDungeonRunEvent } from "@/services/fellowship/dungeon-runs/track-dungeon-run.ts";
import { initialMilestoneProcessorState } from "@/services/fellowship/milestones/milestone-processor-state.ts";
import { type CompiledFellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import {
  type DungeonRunObservation,
  processMilestoneEvent,
} from "@/services/fellowship/milestones/process-milestone-event.ts";
import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";
import { doesDungeonRunMatchConfiguration } from "@/services/fellowship/utilities/does-dungeon-run-match-configuration.ts";
import { isDungeonExitEvent } from "@/services/fellowship/utilities/is-dungeon-exit-event.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";

import { type DungeonRunProcessingState } from "./dungeon-run-processing-state.ts";

export const DUNGEON_RUN_PROCESSING_EVENT = {
  MILESTONE_COMPLETED: "MILESTONE_COMPLETED",
  RUN_COMPLETED: "RUN_COMPLETED",
  RUN_EXITED: "RUN_EXITED",
  RUN_STARTED: "RUN_STARTED",
} as const;

export type DungeonRunProcessingEvent =
  | {
      readonly milestone: FellowshipRunMilestone;
      readonly type: typeof DUNGEON_RUN_PROCESSING_EVENT.MILESTONE_COMPLETED;
    }
  | {
      readonly timestamp: DateTime.Utc;
      readonly type: typeof DUNGEON_RUN_PROCESSING_EVENT.RUN_COMPLETED;
    }
  | {
      readonly timestamp: DateTime.Utc;
      readonly type: typeof DUNGEON_RUN_PROCESSING_EVENT.RUN_EXITED;
    }
  | {
      readonly timestamp: DateTime.Utc;
      readonly type: typeof DUNGEON_RUN_PROCESSING_EVENT.RUN_STARTED;
    };

export type ProcessDungeonRunEventOptions = {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly state: DungeonRunProcessingState;
};

export type ProcessDungeonRunEventResult = {
  readonly events: ReadonlyArray<DungeonRunProcessingEvent>;
  readonly isStateUpdated: boolean;
  readonly observation: DungeonRunObservation | undefined;
  readonly state: DungeonRunProcessingState;
};

type GetDungeonRunStartForEventOptions = {
  readonly completedRunStart: DungeonStartEvent | undefined;
  readonly currentStart: DungeonStartEvent | undefined;
  readonly event: FellowshipEvent;
};

function getDungeonRunStartForEvent({
  completedRunStart,
  currentStart,
  event,
}: GetDungeonRunStartForEventOptions): DungeonStartEvent | undefined {
  if (event.type === FELLOWSHIP_EVENT.DUNGEON_START) {
    return event;
  }

  return completedRunStart ?? currentStart;
}

function doesDungeonRunStartMatchConfiguration({
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

export function processDungeonRunEvent({
  configuration,
  event,
  state,
}: ProcessDungeonRunEventOptions): ProcessDungeonRunEventResult {
  const isDungeonStart = event.type === FELLOWSHIP_EVENT.DUNGEON_START;

  const isConfiguredDungeonStart =
    isDungeonStart &&
    doesDungeonRunStartMatchConfiguration({
      configuration,
      runStart: event,
    });

  const currentRunStart = state.runTracker.currentStart;

  const wasConfiguredRunActive =
    currentRunStart !== undefined &&
    doesDungeonRunStartMatchConfiguration({
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

  const hasCompletedConfiguredRun =
    wasConfiguredRunActive && trackerResult.completedRun !== undefined;

  const milestoneProcessor = isConfiguredDungeonStart
    ? initialMilestoneProcessorState
    : state.milestoneProcessor;

  const runStart = getDungeonRunStartForEvent({
    completedRunStart: trackerResult.completedRun?.start,
    currentStart: state.runTracker.currentStart,
    event,
  });

  if (
    runStart === undefined ||
    !doesDungeonRunStartMatchConfiguration({
      configuration,
      runStart,
    })
  ) {
    return {
      events: [],
      isStateUpdated: false,
      observation: undefined,
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

  const dungeonStartEvents: ReadonlyArray<DungeonRunProcessingEvent> =
    isConfiguredDungeonStart
      ? [
          {
            timestamp,
            type: DUNGEON_RUN_PROCESSING_EVENT.RUN_STARTED,
          },
        ]
      : [];

  const milestoneEvents: ReadonlyArray<DungeonRunProcessingEvent> =
    milestoneResult.milestones.map((milestone) => {
      return {
        milestone,
        type: DUNGEON_RUN_PROCESSING_EVENT.MILESTONE_COMPLETED,
      };
    });

  const dungeonCompletionEvents: ReadonlyArray<DungeonRunProcessingEvent> =
    hasCompletedConfiguredRun
      ? [
          {
            timestamp,
            type: DUNGEON_RUN_PROCESSING_EVENT.RUN_COMPLETED,
          },
        ]
      : [];

  const dungeonExitEvents: ReadonlyArray<DungeonRunProcessingEvent> =
    hasExitedConfiguredRun
      ? [
          {
            timestamp,
            type: DUNGEON_RUN_PROCESSING_EVENT.RUN_EXITED,
          },
        ]
      : [];

  const isStateUpdated =
    isConfiguredDungeonStart ||
    milestoneResult.isStateUpdated ||
    hasCompletedConfiguredRun ||
    hasExitedConfiguredRun;

  return {
    events: [
      ...dungeonStartEvents,
      ...milestoneEvents,
      ...dungeonCompletionEvents,
      ...dungeonExitEvents,
    ],
    isStateUpdated,
    observation: milestoneResult.observation,
    state: {
      milestoneProcessor: milestoneResult.state,
      runTracker: trackerResult.state,
    },
  };
}

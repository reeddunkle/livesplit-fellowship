import type * as DateTime from "effect/DateTime";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import {
  analyzeMilestoneProgress,
  type MilestoneProgress,
} from "@/services/fellowship/milestones/analyze-milestone-progress.ts";
import {
  type MilestoneProcessorState,
  type RequirementObservationHistory,
  type RequirementObservationsByTargetId,
} from "@/services/fellowship/milestones/milestone-processor-state.ts";
import {
  getMilestoneRequirementLookupForEvent,
  type MilestoneRequirementLookup,
} from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import {
  type CompiledFellowshipMilestoneConfiguration,
  type MilestoneRequirementReference,
} from "@/services/fellowship/milestones/milestone-types.ts";
import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";
import { getElapsedMilliseconds } from "@/util/get-elapsed-milliseconds.ts";

export type DungeonRunObservation = {
  readonly occurrence: number;
  readonly targetId: MilestoneRequirementLookup["targetId"];
  readonly timestamp: DateTime.Utc;
  readonly type: MilestoneRequirementEventType;
};

export type ProcessMilestoneEventOptions = {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly runStart: DungeonStartEvent;
  readonly state: MilestoneProcessorState;
};

export type ProcessMilestoneEventResult = {
  readonly isStateUpdated: boolean;
  readonly milestones: ReadonlyArray<FellowshipRunMilestone>;
  readonly observation: DungeonRunObservation | undefined;
  readonly state: MilestoneProcessorState;
};

function getEventTimestamp(event: FellowshipEvent): DateTime.Utc {
  return event.type === "DUNGEON_START" ? event.startedAt : event.timestamp;
}

function getRequirementReferences({
  configuration,
  lookup,
}: {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly lookup: MilestoneRequirementLookup;
}): ReadonlyArray<MilestoneRequirementReference> {
  return Option.flatMap(
    HashMap.get(configuration.requirementsByEvent, lookup.type),
    (referencesByTargetId) => {
      return HashMap.get(referencesByTargetId, lookup.targetId);
    },
  ).pipe(Option.getOrElse(() => []));
}

function getMaximumRequiredOccurrence(
  references: ReadonlyArray<MilestoneRequirementReference>,
): number {
  return references.reduce((maximumOccurrence, reference) => {
    const endOccurrence =
      reference.startOccurrence + reference.requiredCount - 1;

    return Math.max(maximumOccurrence, endOccurrence);
  }, 0);
}

function getObservationHistory({
  lookup,
  state,
}: {
  readonly lookup: MilestoneRequirementLookup;
  readonly state: MilestoneProcessorState;
}): RequirementObservationHistory | undefined {
  return Option.flatMap(
    HashMap.get(state.requirementObservations, lookup.type),
    (observationsByTargetId) => {
      return HashMap.get(observationsByTargetId, lookup.targetId);
    },
  ).pipe(Option.getOrUndefined);
}

function addRequirementObservation({
  lookup,
  state,
  timestamp,
}: {
  readonly lookup: MilestoneRequirementLookup;
  readonly state: MilestoneProcessorState;
  readonly timestamp: DateTime.Utc;
}): MilestoneProcessorState {
  const observationsByTargetId: RequirementObservationsByTargetId =
    Option.getOrElse(
      HashMap.get(state.requirementObservations, lookup.type),
      () => HashMap.empty(),
    );

  const observationHistory = Option.getOrElse(
    HashMap.get(observationsByTargetId, lookup.targetId),
    () => {
      return {
        observations: [],
      } satisfies RequirementObservationHistory;
    },
  );

  const nextObservationHistory = {
    observations: [
      ...observationHistory.observations,
      {
        timestamp,
      },
    ],
  } satisfies RequirementObservationHistory;

  const nextObservationsByTargetId = HashMap.set(
    observationsByTargetId,
    lookup.targetId,
    nextObservationHistory,
  );

  return {
    requirementObservations: HashMap.set(
      state.requirementObservations,
      lookup.type,
      nextObservationsByTargetId,
    ),
  };
}

function createRunMilestone({
  progress,
  runStart,
}: {
  readonly progress: MilestoneProgress;
  readonly runStart: DungeonStartEvent;
}): FellowshipRunMilestone | undefined {
  const timestamp = progress.completedAt;

  if (timestamp === undefined) {
    return undefined;
  }

  return {
    elapsedMilliseconds: getElapsedMilliseconds(runStart.startedAt, timestamp),
    label: progress.definition.label,
    milestoneId: progress.definition.milestoneId,
    timestamp,
  };
}

function getNewlyCompletedMilestones({
  nextMilestones,
  previousMilestones,
  runStart,
}: {
  readonly nextMilestones: ReadonlyArray<MilestoneProgress>;
  readonly previousMilestones: ReadonlyArray<MilestoneProgress>;
  readonly runStart: DungeonStartEvent;
}): ReadonlyArray<FellowshipRunMilestone> {
  return nextMilestones.flatMap((nextMilestone) => {
    if (!nextMilestone.isComplete) {
      return [];
    }

    const previousMilestone = previousMilestones.find((candidateMilestone) => {
      return (
        candidateMilestone.definition.milestoneId ===
        nextMilestone.definition.milestoneId
      );
    });

    if (previousMilestone?.isComplete === true) {
      return [];
    }

    const milestone = createRunMilestone({
      progress: nextMilestone,
      runStart,
    });

    return milestone === undefined ? [] : [milestone];
  });
}

export function processMilestoneEvent({
  configuration,
  event,
  runStart,
  state,
}: ProcessMilestoneEventOptions): ProcessMilestoneEventResult {
  const initialResult: ProcessMilestoneEventResult = {
    isStateUpdated: false,
    milestones: [],
    observation: undefined,
    state,
  };

  const lookup = getMilestoneRequirementLookupForEvent(event);

  if (lookup === undefined) {
    return initialResult;
  }

  const references = getRequirementReferences({
    configuration,
    lookup,
  });

  if (references.length === 0) {
    return initialResult;
  }

  const observationHistory = getObservationHistory({
    lookup,
    state,
  });

  const currentOccurrenceCount = observationHistory?.observations.length ?? 0;

  const maximumRequiredOccurrence = getMaximumRequiredOccurrence(references);

  if (currentOccurrenceCount >= maximumRequiredOccurrence) {
    return initialResult;
  }

  const timestamp = getEventTimestamp(event);

  const observation = {
    occurrence: currentOccurrenceCount + 1,
    targetId: lookup.targetId,
    timestamp,
    type: lookup.type,
  } satisfies DungeonRunObservation;

  const previousAnalysis = analyzeMilestoneProgress({
    configuration,
    state,
  });

  const nextState = addRequirementObservation({
    lookup,
    state,
    timestamp,
  });

  const nextAnalysis = analyzeMilestoneProgress({
    configuration,
    state: nextState,
  });

  const milestones = getNewlyCompletedMilestones({
    nextMilestones: nextAnalysis.milestones,
    previousMilestones: previousAnalysis.milestones,
    runStart,
  });

  return {
    isStateUpdated: true,
    milestones,
    observation,
    state: nextState,
  };
}

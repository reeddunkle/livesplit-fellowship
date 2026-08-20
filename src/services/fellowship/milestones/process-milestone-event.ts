import type * as DateTime from "effect/DateTime";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import {
  type MilestoneProcessorState,
  type ObservedRequirement,
  type ObservedRequirements,
  type ObservedRequirementsById,
} from "@/services/fellowship/milestones/milestone-processor-state.ts";
import {
  getMilestoneRequirementLookupForEvent,
  type MilestoneRequirementId,
  type MilestoneRequirementLookup,
} from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import {
  type CompiledFellowshipMilestoneConfiguration,
  type CompiledMilestoneDefinition,
  type MilestoneRequirementTarget,
} from "@/services/fellowship/milestones/milestone-types.ts";
import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";
import { getElapsedMilliseconds } from "@/util/get-elapsed-milliseconds.ts";

export type ProcessMilestoneEventOptions = {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly runStart: DungeonStartEvent;
  readonly state: MilestoneProcessorState;
};

export type ProcessMilestoneEventResult = {
  readonly milestones: ReadonlyArray<FellowshipRunMilestone>;
  readonly isRequirementsUpdated: boolean;
  readonly state: MilestoneProcessorState;
};

type ProcessMilestoneTargetAccumulator = {
  readonly milestones: ReadonlyArray<FellowshipRunMilestone>;
  readonly isRequirementsUpdated: boolean;
  readonly state: MilestoneProcessorState;
};

type ProcessMilestoneTargetOptions = {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly lookup: MilestoneRequirementLookup;
  readonly runStart: DungeonStartEvent;
  readonly target: MilestoneRequirementTarget;
};

function getEventTimestamp(event: FellowshipEvent): DateTime.Utc {
  return event.type === FELLOWSHIP_EVENT.DUNGEON_START
    ? event.startedAt
    : event.timestamp;
}

function getObservedRequirements({
  milestoneId,
  state,
}: {
  readonly milestoneId: string;
  readonly state: MilestoneProcessorState;
}): ObservedRequirements {
  return Option.getOrElse(
    HashMap.get(state.observedRequirements, milestoneId),
    () => HashMap.empty(),
  );
}

function getMilestoneTargets({
  configuration,
  lookup,
}: {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly lookup: MilestoneRequirementLookup;
}): ReadonlyArray<MilestoneRequirementTarget> {
  return Option.flatMap(
    HashMap.get(configuration.requirementsByEvent, lookup.type),
    (requirementsById) => {
      return HashMap.get(requirementsById, lookup.id);
    },
  ).pipe(Option.getOrElse(() => []));
}

function getObservedRequirement({
  id,
  observedRequirements,
  type,
}: {
  readonly id: MilestoneRequirementId;
  readonly observedRequirements: ObservedRequirements;
  readonly type: MilestoneRequirementLookup["type"];
}): ObservedRequirement | undefined {
  return Option.flatMap(
    HashMap.get(observedRequirements, type),
    (requirementsById) => {
      return HashMap.get(requirementsById, id);
    },
  ).pipe(Option.getOrUndefined);
}

function getObservedRequirementCount({
  id,
  observedRequirements,
  type,
}: {
  readonly id: MilestoneRequirementId;
  readonly observedRequirements: ObservedRequirements;
  readonly type: MilestoneRequirementLookup["type"];
}): number {
  const observedRequirement = getObservedRequirement({
    id,
    observedRequirements,
    type,
  });

  return observedRequirement?.observations.length ?? 0;
}

function addObservedRequirement({
  lookup,
  observedRequirements,
  timestamp,
}: {
  readonly lookup: MilestoneRequirementLookup;
  readonly observedRequirements: ObservedRequirements;
  readonly timestamp: DateTime.Utc;
}): ObservedRequirements {
  const requirementsById: ObservedRequirementsById = Option.getOrElse(
    HashMap.get(observedRequirements, lookup.type),
    () => HashMap.empty(),
  );

  const observedRequirement = Option.getOrElse(
    HashMap.get(requirementsById, lookup.id),
    () => {
      return {
        observations: [],
      } satisfies ObservedRequirement;
    },
  );

  const nextObservedRequirement = {
    observations: [
      ...observedRequirement.observations,
      {
        timestamp,
      },
    ],
  } satisfies ObservedRequirement;

  const nextRequirementsById = HashMap.set(
    requirementsById,
    lookup.id,
    nextObservedRequirement,
  );

  return HashMap.set(observedRequirements, lookup.type, nextRequirementsById);
}

function isMilestoneComplete({
  definition,
  observedRequirements,
}: {
  readonly definition: CompiledMilestoneDefinition;
  readonly observedRequirements: ObservedRequirements;
}): boolean {
  return definition.requirements.every((requirement) => {
    const observedCount = getObservedRequirementCount({
      id: requirement.id,
      observedRequirements,
      type: requirement.type,
    });

    return observedCount >= requirement.requiredCount;
  });
}

function createRunMilestone({
  definition,
  event,
  runStart,
}: {
  readonly definition: CompiledMilestoneDefinition;
  readonly event: FellowshipEvent;
  readonly runStart: DungeonStartEvent;
}): FellowshipRunMilestone {
  const timestamp = getEventTimestamp(event);

  const elapsedMilliseconds =
    event.type === FELLOWSHIP_EVENT.DUNGEON_START
      ? 0
      : getElapsedMilliseconds(runStart.startedAt, event.timestamp);

  return {
    elapsedMilliseconds,
    label: definition.label,
    milestoneId: definition.milestoneId,
    timestamp,
  };
}

function processMilestoneTarget(
  accumulator: ProcessMilestoneTargetAccumulator,
  {
    configuration,
    event,
    lookup,
    runStart,
    target,
  }: ProcessMilestoneTargetOptions,
): ProcessMilestoneTargetAccumulator {
  if (HashMap.has(accumulator.state.observedMilestones, target.milestoneId)) {
    return accumulator;
  }

  const definition = Option.getOrElse(
    HashMap.get(configuration.milestonesById, target.milestoneId),
    () => undefined,
  );

  if (definition === undefined) {
    return accumulator;
  }

  const observedRequirements = getObservedRequirements({
    milestoneId: target.milestoneId,
    state: accumulator.state,
  });

  const currentCount = getObservedRequirementCount({
    id: lookup.id,
    observedRequirements,
    type: lookup.type,
  });

  if (currentCount >= target.requiredCount) {
    return accumulator;
  }

  const nextObservedRequirements = addObservedRequirement({
    lookup,
    observedRequirements,
    timestamp: getEventTimestamp(event),
  });

  const nextState: MilestoneProcessorState = {
    ...accumulator.state,
    observedRequirements: HashMap.set(
      accumulator.state.observedRequirements,
      target.milestoneId,
      nextObservedRequirements,
    ),
  };

  if (
    !isMilestoneComplete({
      definition,
      observedRequirements: nextObservedRequirements,
    })
  ) {
    return {
      ...accumulator,
      isRequirementsUpdated: true,
      state: nextState,
    };
  }

  const milestone = createRunMilestone({
    definition,
    event,
    runStart,
  });

  return {
    isRequirementsUpdated: true,
    milestones: [...accumulator.milestones, milestone],
    state: {
      ...nextState,
      observedMilestones: HashMap.set(
        nextState.observedMilestones,
        milestone.milestoneId,
        milestone,
      ),
    },
  };
}

export function processMilestoneEvent({
  configuration,
  event,
  runStart,
  state,
}: ProcessMilestoneEventOptions): ProcessMilestoneEventResult {
  const lookup = getMilestoneRequirementLookupForEvent(event);

  const initialResult: ProcessMilestoneEventResult = {
    isRequirementsUpdated: false,
    milestones: [],
    state,
  };

  if (lookup === undefined) {
    return initialResult;
  }

  const targets = getMilestoneTargets({
    configuration,
    lookup,
  });

  return targets.reduce<ProcessMilestoneTargetAccumulator>(
    (accumulator, target) => {
      return processMilestoneTarget(accumulator, {
        configuration,
        event,
        lookup,
        runStart,
        target,
      });
    },
    initialResult,
  );
}

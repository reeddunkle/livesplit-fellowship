import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import {
  type MilestoneProcessorState,
  type ObservedRequirementCounts,
  type ObservedRequirementCountsById,
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
  readonly state: MilestoneProcessorState;
};

type ProcessMilestoneTargetAccumulator = {
  readonly milestones: ReadonlyArray<FellowshipRunMilestone>;
  readonly state: MilestoneProcessorState;
};

type ProcessMilestoneTargetOptions = {
  readonly configuration: CompiledFellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly lookup: MilestoneRequirementLookup;
  readonly runStart: DungeonStartEvent;
  readonly target: MilestoneRequirementTarget;
};

function getObservedRequirementCounts({
  milestoneId,
  state,
}: {
  readonly milestoneId: string;
  readonly state: MilestoneProcessorState;
}): ObservedRequirementCounts {
  return Option.getOrElse(
    HashMap.get(state.observedRequirementCounts, milestoneId),
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

function getObservedRequirementCount({
  id,
  observedCounts,
  type,
}: {
  readonly id: MilestoneRequirementId;
  readonly observedCounts: ObservedRequirementCounts;
  readonly type: MilestoneRequirementLookup["type"];
}): number {
  return Option.flatMap(HashMap.get(observedCounts, type), (countsById) => {
    return HashMap.get(countsById, id);
  }).pipe(Option.getOrElse(() => 0));
}

function setObservedRequirementCount({
  count,
  lookup,
  observedCounts,
}: {
  readonly count: number;
  readonly lookup: MilestoneRequirementLookup;
  readonly observedCounts: ObservedRequirementCounts;
}): ObservedRequirementCounts {
  const countsById: ObservedRequirementCountsById = Option.getOrElse(
    HashMap.get(observedCounts, lookup.type),
    () => HashMap.empty(),
  );

  const nextCountsById = HashMap.set(countsById, lookup.id, count);

  return HashMap.set(observedCounts, lookup.type, nextCountsById);
}

function isMilestoneComplete({
  definition,
  observedCounts,
}: {
  readonly definition: CompiledMilestoneDefinition;
  readonly observedCounts: ObservedRequirementCounts;
}): boolean {
  return definition.requirements.every((requirement) => {
    const observedCount = getObservedRequirementCount({
      id: requirement.id,
      observedCounts,
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
  const timestamp =
    event.type === FELLOWSHIP_EVENT.DUNGEON_START
      ? event.startedAt
      : event.timestamp;

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

  const observedCounts = getObservedRequirementCounts({
    milestoneId: target.milestoneId,
    state: accumulator.state,
  });

  const currentCount = getObservedRequirementCount({
    id: lookup.id,
    observedCounts,
    type: lookup.type,
  });

  if (currentCount >= target.requiredCount) {
    return accumulator;
  }

  const nextObservedCounts = setObservedRequirementCount({
    count: currentCount + 1,
    lookup,
    observedCounts,
  });

  const nextState: MilestoneProcessorState = {
    ...accumulator.state,
    observedRequirementCounts: HashMap.set(
      accumulator.state.observedRequirementCounts,
      target.milestoneId,
      nextObservedCounts,
    ),
  };

  if (
    !isMilestoneComplete({
      definition,
      observedCounts: nextObservedCounts,
    })
  ) {
    return {
      ...accumulator,
      state: nextState,
    };
  }

  const milestone = createRunMilestone({
    definition,
    event,
    runStart,
  });

  return {
    milestones: [...accumulator.milestones, milestone],
    state: {
      ...nextState,
      observedMilestones: HashMap.set(
        nextState.observedMilestones,
        milestone.milestoneId,
        milestone,
      ),
      observedRequirementCounts: HashMap.remove(
        nextState.observedRequirementCounts,
        milestone.milestoneId,
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

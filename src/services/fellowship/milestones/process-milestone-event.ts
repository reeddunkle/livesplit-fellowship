import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import {
  type MilestoneProcessorState,
  type ObservedRequirementCounts,
} from "@/services/fellowship/milestones/milestone-processor-state.ts";
import {
  getMilestoneRequirementLookupForEvent,
  getMilestoneRequirementLookupKey,
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

function getObservedRequirementCounts({
  milestoneId,
  state,
}: {
  readonly milestoneId: string;
  readonly state: MilestoneProcessorState;
}): ObservedRequirementCounts {
  return Option.getOrElse(
    HashMap.get(state.observedRequirementCounts, milestoneId),
    () => HashMap.empty<string, number>(),
  );
}

function isMilestoneComplete({
  definition,
  observedCounts,
}: {
  readonly definition: CompiledMilestoneDefinition;
  readonly observedCounts: ObservedRequirementCounts;
}): boolean {
  return definition.requirements.every((requirement) => {
    const observedCount = Option.getOrElse(
      HashMap.get(observedCounts, requirement.key),
      () => 0,
    );

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

export function processMilestoneEvent({
  configuration,
  event,
  runStart,
  state,
}: ProcessMilestoneEventOptions): ProcessMilestoneEventResult {
  const lookup = getMilestoneRequirementLookupForEvent(event);

  if (lookup === undefined) {
    return {
      milestones: [],
      state,
    };
  }

  const requirementsById = Option.getOrElse(
    HashMap.get(configuration.requirementsByEvent, lookup.type),
    () => undefined,
  );

  if (requirementsById === undefined) {
    return {
      milestones: [],
      state,
    };
  }

  const targets = Option.getOrElse(
    HashMap.get(requirementsById, lookup.id),
    () => [] as ReadonlyArray<MilestoneRequirementTarget>,
  );

  if (targets.length === 0) {
    return {
      milestones: [],
      state,
    };
  }

  const requirementKey = getMilestoneRequirementLookupKey(lookup);

  const milestones: FellowshipRunMilestone[] = [];

  let nextState = state;

  for (const target of targets) {
    if (HashMap.has(nextState.observedMilestones, target.milestoneId)) {
      continue;
    }

    const definition = Option.getOrElse(
      HashMap.get(configuration.milestonesById, target.milestoneId),
      () => undefined,
    );

    if (definition === undefined) {
      continue;
    }

    const observedCounts = getObservedRequirementCounts({
      milestoneId: target.milestoneId,
      state: nextState,
    });

    const currentCount = Option.getOrElse(
      HashMap.get(observedCounts, requirementKey),
      () => 0,
    );

    if (currentCount >= target.requiredCount) {
      continue;
    }

    const nextObservedCounts = HashMap.set(
      observedCounts,
      requirementKey,
      currentCount + 1,
    );

    const observedRequirementCounts = HashMap.set(
      nextState.observedRequirementCounts,
      target.milestoneId,
      nextObservedCounts,
    );

    nextState = {
      ...nextState,
      observedRequirementCounts,
    };

    if (
      !isMilestoneComplete({
        definition,
        observedCounts: nextObservedCounts,
      })
    ) {
      continue;
    }

    const milestone = createRunMilestone({
      definition,
      event,
      runStart,
    });

    milestones.push(milestone);

    nextState = {
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
    };
  }

  return {
    milestones,
    state: nextState,
  };
}

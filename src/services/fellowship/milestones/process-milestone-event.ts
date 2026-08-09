import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as Match from "effect/Match";
import * as Option from "effect/Option";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { type MilestoneProcessorState } from "@/services/fellowship/milestones/milestone-processor-state.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";
import {
  type FellowshipMilestoneDefinition,
  type FellowshipMilestoneRequirement,
} from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";
import { getElapsedMilliseconds } from "@/util/get-elapsed-milliseconds.ts";

export type ProcessMilestoneEventOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly runStart: DungeonStartEvent;
  readonly state: MilestoneProcessorState;
};

export type ProcessMilestoneEventResult = {
  readonly milestones: ReadonlyArray<FellowshipRunMilestone>;
  readonly state: MilestoneProcessorState;
};

type DoesEventSatisfyRequirementOptions = {
  readonly event: FellowshipEvent;
  readonly requirement: FellowshipMilestoneRequirement;
};

const doesEventSatisfyRequirement = ({
  event,
  requirement,
}: DoesEventSatisfyRequirementOptions): boolean => {
  return Match.value(requirement).pipe(
    Match.when({ type: FELLOWSHIP_EVENT.ABILITY_ACTIVATED }, (requirement) => {
      return (
        event.type === FELLOWSHIP_EVENT.ABILITY_ACTIVATED &&
        event.abilityId === requirement.abilityId
      );
    }),

    Match.when(
      { type: FELLOWSHIP_EVENT.DUNGEON_START },
      () => event.type === FELLOWSHIP_EVENT.DUNGEON_START,
    ),

    Match.when(
      { type: FELLOWSHIP_EVENT.DUNGEON_END },
      () => event.type === FELLOWSHIP_EVENT.DUNGEON_END,
    ),

    Match.when({ type: FELLOWSHIP_EVENT.ENCOUNTER_START }, (requirement) => {
      return (
        event.type === FELLOWSHIP_EVENT.ENCOUNTER_START &&
        event.encounterId === requirement.encounterId
      );
    }),

    Match.when({ type: FELLOWSHIP_EVENT.ENCOUNTER_END }, (requirement) => {
      return (
        event.type === FELLOWSHIP_EVENT.ENCOUNTER_END &&
        event.encounterId === requirement.encounterId &&
        event.succeeded
      );
    }),

    Match.when({ type: FELLOWSHIP_EVENT.UNIT_DEATH }, (requirement) => {
      return (
        event.type === FELLOWSHIP_EVENT.UNIT_DEATH &&
        event.unitTypeId === requirement.unitTypeId
      );
    }),

    Match.exhaustive,
  );
};

type MatchingRequirement = {
  readonly definition: FellowshipMilestoneDefinition;
  readonly requirementIndex: number;
};

type FindMatchingRequirementOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly event: FellowshipEvent;
  readonly state: MilestoneProcessorState;
};

function findMatchingRequirement({
  configuration,
  event,
  state,
}: FindMatchingRequirementOptions): MatchingRequirement | undefined {
  for (const definition of configuration.milestones) {
    if (HashMap.has(state.observedMilestones, definition.milestoneId)) {
      continue;
    }

    const satisfiedIndexes = Option.getOrElse(
      HashMap.get(state.satisfiedRequirementIndexes, definition.milestoneId),
      () => HashSet.empty<number>(),
    );

    const requirementIndex = definition.requirements.findIndex(
      (requirement, index) => {
        return (
          !HashSet.has(satisfiedIndexes, index) &&
          doesEventSatisfyRequirement({
            event,
            requirement,
          })
        );
      },
    );

    if (requirementIndex !== -1) {
      return {
        definition,
        requirementIndex,
      };
    }
  }

  return undefined;
}

export function processMilestoneEvent({
  configuration,
  event,
  runStart,
  state,
}: ProcessMilestoneEventOptions): ProcessMilestoneEventResult {
  const matchingRequirement = findMatchingRequirement({
    configuration,
    event,
    state,
  });

  if (matchingRequirement === undefined) {
    return {
      milestones: [],
      state,
    };
  }

  const { definition, requirementIndex } = matchingRequirement;

  const currentSatisfiedIndexes = Option.getOrElse(
    HashMap.get(state.satisfiedRequirementIndexes, definition.milestoneId),
    () => HashSet.empty<number>(),
  );

  const satisfiedIndexes = HashSet.add(
    currentSatisfiedIndexes,
    requirementIndex,
  );

  const satisfiedRequirementIndexes = HashMap.set(
    state.satisfiedRequirementIndexes,
    definition.milestoneId,
    satisfiedIndexes,
  );

  const isMilestoneComplete =
    HashSet.size(satisfiedIndexes) === definition.requirements.length;

  if (!isMilestoneComplete) {
    return {
      milestones: [],
      state: {
        ...state,
        satisfiedRequirementIndexes,
      },
    };
  }

  const timestamp =
    event.type === FELLOWSHIP_EVENT.DUNGEON_START
      ? event.startedAt
      : event.timestamp;

  const elapsedMilliseconds =
    event.type === FELLOWSHIP_EVENT.DUNGEON_START
      ? 0
      : getElapsedMilliseconds(runStart.startedAt, event.timestamp);

  const milestone = {
    elapsedMilliseconds,
    label: definition.label,
    milestoneId: definition.milestoneId,
    timestamp,
  } satisfies FellowshipRunMilestone;

  return {
    milestones: [milestone],
    state: {
      ...state,
      observedMilestones: HashMap.set(
        state.observedMilestones,
        milestone.milestoneId,
        milestone,
      ),
      satisfiedRequirementIndexes: HashMap.remove(
        satisfiedRequirementIndexes,
        milestone.milestoneId,
      ),
    },
  };
}

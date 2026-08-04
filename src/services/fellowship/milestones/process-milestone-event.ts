import * as HashMap from "effect/HashMap";
import * as Match from "effect/Match";
import * as Option from "effect/Option";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { type MilestoneProcessorState } from "@/services/fellowship/milestones/milestone-processor-state.ts";
import {
  type FellowshipMilestoneConfiguration,
  type FellowshipMilestoneDefinition,
} from "@/services/fellowship/milestones/milestone-types.ts";
import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";
import { type DungeonStartEvent } from "@/services/fellowship/validation/events/dungeon-start.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";
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

function incrementUnitDeathCount({
  state,
  unitTypeId,
}: {
  readonly state: MilestoneProcessorState;
  readonly unitTypeId: number;
}): {
  readonly count: number;
  readonly state: MilestoneProcessorState;
} {
  const currentCount = Option.getOrElse(
    HashMap.get(state.unitDeathCounts, unitTypeId),
    () => 0,
  );

  const count = currentCount + 1;

  return {
    count,
    state: {
      ...state,
      unitDeathCounts: HashMap.set(state.unitDeathCounts, unitTypeId, count),
    },
  };
}

function updateEventCounts({
  event,
  state,
}: {
  readonly event: FellowshipEvent;
  readonly state: MilestoneProcessorState;
}): {
  readonly unitDeathOccurrence: number | undefined;
  readonly state: MilestoneProcessorState;
} {
  if (event.type !== FELLOWSHIP_EVENT.UNIT_DEATH) {
    return {
      state,
      unitDeathOccurrence: undefined,
    };
  }

  const result = incrementUnitDeathCount({
    state,
    unitTypeId: event.unitTypeId,
  });

  return {
    state: result.state,
    unitDeathOccurrence: result.count,
  };
}

type DoesEventCompleteMilestoneOptions = {
  readonly definition: FellowshipMilestoneDefinition;
  readonly event: FellowshipEvent;
  readonly unitDeathOccurrence: number | undefined;
};

const doesEventCompleteMilestone = ({
  definition,
  event,
  unitDeathOccurrence,
}: DoesEventCompleteMilestoneOptions): boolean => {
  return Match.value(definition.trigger).pipe(
    Match.when(
      { type: "DUNGEON_START" },
      () => event.type === FELLOWSHIP_EVENT.DUNGEON_START,
    ),

    Match.when(
      { type: "DUNGEON_END" },
      () => event.type === FELLOWSHIP_EVENT.DUNGEON_END,
    ),

    Match.when({ type: "ENCOUNTER_START" }, (trigger) => {
      return (
        event.type === FELLOWSHIP_EVENT.ENCOUNTER_START &&
        event.encounterId === trigger.encounterId
      );
    }),

    Match.when({ type: "ENCOUNTER_END" }, (trigger) => {
      return (
        event.type === FELLOWSHIP_EVENT.ENCOUNTER_END &&
        event.encounterId === trigger.encounterId &&
        event.succeeded
      );
    }),

    Match.when({ type: "UNIT_DEATH" }, (trigger) => {
      return (
        event.type === FELLOWSHIP_EVENT.UNIT_DEATH &&
        event.unitTypeId === trigger.unitTypeId &&
        unitDeathOccurrence === trigger.occurrence
      );
    }),

    Match.exhaustive,
  );
};

export function processMilestoneEvent({
  configuration,
  event,
  runStart,
  state,
}: ProcessMilestoneEventOptions): ProcessMilestoneEventResult {
  const countResult = updateEventCounts({
    event,
    state,
  });

  const definitions = configuration.milestones.filter((definition) => {
    return !HashMap.has(
      countResult.state.observedMilestones,
      definition.milestoneId,
    );
  });

  const matchingDefinitions = definitions.filter((definition) => {
    return doesEventCompleteMilestone({
      definition,
      event,
      unitDeathOccurrence: countResult.unitDeathOccurrence,
    });
  });

  if (matchingDefinitions.length === 0) {
    return {
      milestones: [],
      state: countResult.state,
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

  const milestones = matchingDefinitions.map((definition) => {
    return {
      elapsedMilliseconds,
      label: definition.label,
      milestoneId: definition.milestoneId,
      timestamp,
      type: definition.trigger.type,
    } satisfies FellowshipRunMilestone;
  });

  const observedMilestones = milestones.reduce((result, milestone) => {
    return HashMap.set(result, milestone.milestoneId, milestone);
  }, countResult.state.observedMilestones);

  return {
    milestones,
    state: {
      ...countResult.state,
      observedMilestones,
    },
  };
}

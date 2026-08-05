import * as HashMap from "effect/HashMap";
import * as Match from "effect/Match";

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

type DoesEventCompleteMilestoneOptions = {
  readonly definition: FellowshipMilestoneDefinition;
  readonly event: FellowshipEvent;
};

const doesEventCompleteMilestone = ({
  definition,
  event,
}: DoesEventCompleteMilestoneOptions): boolean => {
  return Match.value(definition).pipe(
    Match.when(
      { type: FELLOWSHIP_EVENT.DUNGEON_START },
      () => event.type === FELLOWSHIP_EVENT.DUNGEON_START,
    ),

    Match.when(
      { type: FELLOWSHIP_EVENT.DUNGEON_END },
      () => event.type === FELLOWSHIP_EVENT.DUNGEON_END,
    ),

    Match.when({ type: FELLOWSHIP_EVENT.ENCOUNTER_START }, (definition) => {
      return (
        event.type === FELLOWSHIP_EVENT.ENCOUNTER_START &&
        event.encounterId === definition.encounterId
      );
    }),

    Match.when({ type: FELLOWSHIP_EVENT.ENCOUNTER_END }, (definition) => {
      return (
        event.type === FELLOWSHIP_EVENT.ENCOUNTER_END &&
        event.encounterId === definition.encounterId &&
        event.succeeded
      );
    }),

    Match.when({ type: FELLOWSHIP_EVENT.UNIT_DEATH }, (definition) => {
      return (
        event.type === FELLOWSHIP_EVENT.UNIT_DEATH &&
        event.unitTypeId === definition.unitTypeId
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
  const matchingDefinition = configuration.milestones.find((definition) => {
    const hasAlreadyBeenObserved = HashMap.has(
      state.observedMilestones,
      definition.milestoneId,
    );

    return (
      !hasAlreadyBeenObserved &&
      doesEventCompleteMilestone({
        definition,
        event,
      })
    );
  });

  if (matchingDefinition === undefined) {
    return {
      milestones: [],
      state,
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
    label: matchingDefinition.label,
    milestoneId: matchingDefinition.milestoneId,
    timestamp,
    type: matchingDefinition.type,
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
    },
  };
}

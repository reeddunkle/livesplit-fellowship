import * as Match from "effect/Match";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { type FellowshipEvent } from "@/services/fellowship/validation/fellowship-event-schema.ts";
import { type FellowshipMilestoneRequirement } from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";

export type MilestoneRequirementEventType =
  FellowshipMilestoneRequirement["type"];

export type MilestoneRequirementId = string;

export type MilestoneRequirementLookup = {
  readonly id: MilestoneRequirementId;
  readonly type: MilestoneRequirementEventType;
};

type GetMilestoneRequirementLookupOptions = {
  readonly dungeonId: string;
  readonly requirement: FellowshipMilestoneRequirement;
};

export function getMilestoneRequirementLookup({
  dungeonId,
  requirement,
}: GetMilestoneRequirementLookupOptions): MilestoneRequirementLookup {
  return Match.value(requirement).pipe(
    Match.when({ type: FELLOWSHIP_EVENT.ABILITY_ACTIVATED }, (requirement) => {
      return {
        id: requirement.abilityId,
        type: requirement.type,
      };
    }),

    Match.when({ type: FELLOWSHIP_EVENT.DUNGEON_START }, (requirement) => {
      return {
        id: dungeonId,
        type: requirement.type,
      };
    }),

    Match.when({ type: FELLOWSHIP_EVENT.DUNGEON_END }, (requirement) => {
      return {
        id: dungeonId,
        type: requirement.type,
      };
    }),

    Match.when({ type: FELLOWSHIP_EVENT.ENCOUNTER_START }, (requirement) => {
      return {
        id: requirement.encounterId,
        type: requirement.type,
      };
    }),

    Match.when({ type: FELLOWSHIP_EVENT.ENCOUNTER_END }, (requirement) => {
      return {
        id: requirement.encounterId,
        type: requirement.type,
      };
    }),

    Match.when({ type: FELLOWSHIP_EVENT.UNIT_DEATH }, (requirement) => {
      return {
        id: requirement.unitTypeId,
        type: requirement.type,
      };
    }),

    Match.exhaustive,
  );
}

export function getMilestoneRequirementLookupForEvent(
  event: FellowshipEvent,
): MilestoneRequirementLookup | undefined {
  return Match.value(event).pipe(
    Match.when({ type: FELLOWSHIP_EVENT.ABILITY_ACTIVATED }, (event) => {
      return {
        id: event.abilityId,
        type: event.type,
      };
    }),

    Match.when({ type: FELLOWSHIP_EVENT.DUNGEON_START }, (event) => {
      return {
        id: event.dungeonId,
        type: event.type,
      };
    }),

    Match.when({ type: FELLOWSHIP_EVENT.DUNGEON_END }, (event) => {
      return {
        id: event.dungeonId,
        type: event.type,
      };
    }),

    Match.when({ type: FELLOWSHIP_EVENT.ENCOUNTER_START }, (event) => {
      return {
        id: event.encounterId,
        type: event.type,
      };
    }),

    Match.when(
      {
        succeeded: true,
        type: FELLOWSHIP_EVENT.ENCOUNTER_END,
      },
      (event) => {
        return {
          id: event.encounterId,
          type: event.type,
        };
      },
    ),

    Match.when({ type: FELLOWSHIP_EVENT.UNIT_DEATH }, (event) => {
      return {
        id: event.unitTypeId,
        type: event.type,
      };
    }),

    Match.orElse(() => undefined),
  );
}

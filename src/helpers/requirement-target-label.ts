import * as A from "effect/Array";
import * as Match from "effect/Match";
import * as Option from "effect/Option";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { type RequirementEventType } from "@/services/fellowship/validation/requirement-event-type-schema.ts";

type Ability = {
  readonly id: string;
  readonly name: string;
};

type Dungeon = {
  readonly id: string;
  readonly name: string;
};

type Encounter = {
  readonly id: string;
  readonly name: string;
};

type Unit = {
  readonly id: string;
  readonly name: string;
  readonly variant: string | null;
};

type RequirementTargetLabelData = {
  readonly abilities: ReadonlyArray<Ability>;
  readonly dungeons: ReadonlyArray<Dungeon>;
  readonly encounters: ReadonlyArray<Encounter>;
  readonly units: ReadonlyArray<Unit>;
};

type GetRequirementTargetLabelOptions = RequirementTargetLabelData & {
  readonly eventType: RequirementEventType;
  readonly targetId: string;
};

export function getUnitTargetLabel(unit: Unit): string {
  return unit.variant === null ? unit.name : `${unit.name} (${unit.variant})`;
}

function findNameById(
  values: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>,
  targetId: string,
): string | undefined {
  return Option.getOrUndefined(
    A.findFirst(values, (value) => {
      return value.id === targetId;
    }).pipe(
      Option.map((value) => {
        return value.name;
      }),
    ),
  );
}

function findUnitLabelById(
  units: ReadonlyArray<Unit>,
  targetId: string,
): string | undefined {
  return Option.getOrUndefined(
    A.findFirst(units, (unit) => {
      return unit.id === targetId;
    }).pipe(Option.map(getUnitTargetLabel)),
  );
}

export function getRequirementTargetLabel({
  abilities,
  dungeons,
  encounters,
  eventType,
  targetId,
  units,
}: GetRequirementTargetLabelOptions): string {
  const label = Match.value(eventType).pipe(
    Match.when(FELLOWSHIP_EVENT.ABILITY_ACTIVATED, () => {
      return findNameById(abilities, targetId);
    }),
    Match.whenOr(
      FELLOWSHIP_EVENT.DUNGEON_START,
      FELLOWSHIP_EVENT.DUNGEON_END,
      () => {
        return findNameById(dungeons, targetId);
      },
    ),
    Match.whenOr(
      FELLOWSHIP_EVENT.ENCOUNTER_START,
      FELLOWSHIP_EVENT.ENCOUNTER_END,
      () => {
        return findNameById(encounters, targetId);
      },
    ),
    Match.when(FELLOWSHIP_EVENT.UNIT_DEATH, () => {
      return findUnitLabelById(units, targetId);
    }),
    Match.exhaustive,
  );

  return label ?? `Custom (${targetId})`;
}

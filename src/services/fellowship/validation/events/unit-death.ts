import { SchemaGetter } from "effect";
import * as Schema from "effect/Schema";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { TimestampSchema } from "@/services/fellowship/validation/common.ts";
import {
  IntegerFromStringSchema,
  JsonStringSchema,
} from "@/validation/common.ts";

const UnitDeathLogLineSchema = Schema.Tuple([
  Schema.DateTimeUtcFromString,
  Schema.Literal(FELLOWSHIP_EVENT.UNIT_DEATH),
  Schema.String,
  JsonStringSchema,
  Schema.String,
  JsonStringSchema,
  IntegerFromStringSchema,
  JsonStringSchema,
  IntegerFromStringSchema,
  Schema.NumberFromString,
]);

const UnitDeathEventSchema = Schema.Struct({
  abilityId: Schema.Number,
  abilityName: Schema.String,
  dungeonProgress: Schema.Number,
  relatedAbilityId: Schema.Number,
  sourcePlayerId: Schema.String,
  sourcePlayerName: Schema.String,
  timestamp: TimestampSchema,
  type: Schema.Literal(FELLOWSHIP_EVENT.UNIT_DEATH),
  unitId: Schema.String,
  unitInstanceId: Schema.String,
  unitName: Schema.String,
  unitTypeId: Schema.Number,
});

function parseUnitId(unitId: string): {
  readonly unitInstanceId: string;
  readonly unitTypeId: number;
} {
  const segments = unitId.split("-");
  const unitTypeId = Number(segments.at(-1));
  const unitInstanceId = segments.at(-2);

  if (unitInstanceId === undefined || !Number.isInteger(unitTypeId)) {
    return {
      unitInstanceId: unitId,
      unitTypeId: 0,
    };
  }

  return {
    unitInstanceId,
    unitTypeId,
  };
}

export const UnitDeathEventFromLogSchema = UnitDeathLogLineSchema.pipe(
  Schema.decodeTo(UnitDeathEventSchema, {
    decode: SchemaGetter.transform(
      ([
        timestamp,
        type,
        unitId,
        unitName,
        sourcePlayerId,
        sourcePlayerName,
        abilityId,
        abilityName,
        relatedAbilityId,
        dungeonProgress,
      ]) => {
        const { unitInstanceId, unitTypeId } = parseUnitId(unitId);

        return {
          abilityId,
          abilityName,
          dungeonProgress,
          relatedAbilityId,
          sourcePlayerId,
          sourcePlayerName,
          timestamp,
          type,
          unitId,
          unitInstanceId,
          unitName,
          unitTypeId,
        };
      },
    ),

    encode: SchemaGetter.transform((event) => {
      return [
        event.timestamp,
        event.type,
        event.unitId,
        event.unitName,
        event.sourcePlayerId,
        event.sourcePlayerName,
        event.abilityId,
        event.abilityName,
        event.relatedAbilityId,
        event.dungeonProgress,
      ] as const;
    }),
  }),
);

import { SchemaGetter } from "effect";
import * as Schema from "effect/Schema";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import { TimestampSchema } from "@/services/fellowship/validation/common.ts";
import {
  IntegerFromStringSchema,
  JsonStringSchema,
} from "@/validation/common.ts";

const AbilityActivatedLogLineSchema = Schema.Tuple([
  Schema.DateTimeUtcFromString,
  Schema.Literal(FELLOWSHIP_EVENT.ABILITY_ACTIVATED),
  Schema.String,
  JsonStringSchema,
  IntegerFromStringSchema,
  JsonStringSchema,
  IntegerFromStringSchema,
  Schema.String,
  JsonStringSchema,
  IntegerFromStringSchema,
  IntegerFromStringSchema,
  IntegerFromStringSchema,
  Schema.NumberFromString,
  Schema.NumberFromString,
  Schema.NumberFromString,
  Schema.String,
]);

const AbilityActivatedEventSchema = Schema.Struct({
  abilityId: Schema.Number,
  abilityName: Schema.String,
  hasTarget: Schema.Boolean,
  sourceId: Schema.String,
  sourceName: Schema.String,
  targetId: Schema.String,
  targetName: Schema.String,
  timestamp: TimestampSchema,
  type: Schema.Literal(FELLOWSHIP_EVENT.ABILITY_ACTIVATED),
  unmapped: Schema.Struct({
    currentHealth: Schema.Number,
    maximumHealth: Schema.Number,
    positionX: Schema.Number,
    positionY: Schema.Number,
    positionZ: Schema.Number,
    resourceValue: Schema.Number,
    unmappedArrayData: Schema.String,
  }),
});

export const AbilityActivatedEventFromLogSchema =
  AbilityActivatedLogLineSchema.pipe(
    Schema.decodeTo(AbilityActivatedEventSchema, {
      decode: SchemaGetter.transform(
        ([
          timestamp,
          type,
          sourceId,
          sourceName,
          abilityId,
          abilityName,
          hasTarget,
          targetId,
          targetName,
          currentHealth,
          maximumHealth,
          resourceValue,
          positionX,
          positionY,
          positionZ,
          unmappedArrayData,
        ]) => {
          return {
            abilityId,
            abilityName,
            hasTarget: hasTarget === 1,
            sourceId,
            sourceName,
            targetId,
            targetName,
            timestamp,
            type,
            unmapped: {
              currentHealth,
              maximumHealth,
              positionX,
              positionY,
              positionZ,
              resourceValue,
              unmappedArrayData,
            },
          };
        },
      ),
      encode: SchemaGetter.transform((event) => {
        return [
          event.timestamp,
          event.type,
          event.sourceId,
          event.sourceName,
          event.abilityId,
          event.abilityName,
          event.hasTarget ? 1 : 0,
          event.targetId,
          event.targetName,
          event.unmapped.currentHealth,
          event.unmapped.maximumHealth,
          event.unmapped.resourceValue,
          event.unmapped.positionX,
          event.unmapped.positionY,
          event.unmapped.positionZ,
          event.unmapped.unmappedArrayData,
        ] as const;
      }),
    }),
  );

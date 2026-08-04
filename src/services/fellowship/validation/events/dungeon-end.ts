import { SchemaGetter } from "effect";
import * as Schema from "effect/Schema";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import {
  DungeonAffixIdsSchema,
  DungeonNameSchema,
  KeyLevelSchema,
  TimestampSchema,
  ZoneIdSchema,
} from "@/services/fellowship/validation/common.ts";
import {
  BooleanFlagSchema,
  IntegerFromStringSchema,
  JsonIntegerArraySchema,
  JsonStringSchema,
} from "@/validation/common.ts";

const DungeonEndLogLineSchema = Schema.Tuple([
  Schema.DateTimeUtcFromString,
  Schema.Literal(FELLOWSHIP_EVENT.DUNGEON_END),
  JsonStringSchema,
  IntegerFromStringSchema,
  IntegerFromStringSchema,
  JsonIntegerArraySchema,
  BooleanFlagSchema,
  IntegerFromStringSchema,
  Schema.NumberFromString,
  BooleanFlagSchema,
  BooleanFlagSchema,
  BooleanFlagSchema,
]);

const DungeonEndUnmappedSchema = Schema.Struct({
  flag1: Schema.Boolean,
  flag2: Schema.Boolean,
  flag3: Schema.Boolean,
  numericField1: Schema.Int,
  numericField2: Schema.Number,
});

const DungeonEndEventSchema = Schema.Struct({
  affixIds: DungeonAffixIdsSchema,
  dungeonName: DungeonNameSchema,
  keyLevel: KeyLevelSchema,
  succeeded: Schema.Boolean,
  timestamp: TimestampSchema,
  type: Schema.Literal(FELLOWSHIP_EVENT.DUNGEON_END),
  unmapped: DungeonEndUnmappedSchema,
  zoneId: ZoneIdSchema,
});

export const DungeonEndEventFromLogSchema = DungeonEndLogLineSchema.pipe(
  Schema.decodeTo(DungeonEndEventSchema, {
    decode: SchemaGetter.transform(
      ([
        timestamp,
        type,
        dungeonName,
        keyLevel,
        zoneId,
        affixIds,
        succeeded,
        numericField1,
        numericField2,
        flag1,
        flag2,
        flag3,
      ]) => {
        return {
          affixIds,
          dungeonName,
          keyLevel,
          succeeded,
          timestamp,
          type,
          unmapped: {
            flag1,
            flag2,
            flag3,
            numericField1,
            numericField2,
          },
          zoneId,
        };
      },
    ),

    encode: SchemaGetter.transform((event) => {
      return [
        event.timestamp,
        event.type,
        event.dungeonName,
        event.keyLevel,
        event.zoneId,
        event.affixIds,
        event.succeeded,
        event.unmapped.numericField1,
        event.unmapped.numericField2,
        event.unmapped.flag1,
        event.unmapped.flag2,
        event.unmapped.flag3,
      ] as const;
    }),
  }),
);

export type DungeonEndEvent = typeof DungeonEndEventFromLogSchema.Type;

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
  EmptyStringSchema,
  IntegerFromStringSchema,
  JsonIntegerArraySchema,
  JsonStringSchema,
} from "@/validation/common.ts";

const DungeonStartLogLineSchema = Schema.Tuple([
  Schema.DateTimeUtcFromString,
  Schema.Literal(FELLOWSHIP_EVENT.DUNGEON_START),
  JsonStringSchema,
  IntegerFromStringSchema,
  IntegerFromStringSchema,
  JsonIntegerArraySchema,
  BooleanFlagSchema,
  Schema.DateTimeUtcFromString,
  EmptyStringSchema,
]);

const DungeonStartEventSchema = Schema.Struct({
  affixIds: DungeonAffixIdsSchema,
  dungeonName: DungeonNameSchema,
  keyLevel: KeyLevelSchema,
  startedAt: Schema.DateTimeUtc,
  timestamp: TimestampSchema,
  type: Schema.Literal(FELLOWSHIP_EVENT.DUNGEON_START),
  unmappedFlag: Schema.Boolean,
  zoneId: ZoneIdSchema,
});

export const DungeonStartEventFromLogSchema = DungeonStartLogLineSchema.pipe(
  Schema.decodeTo(DungeonStartEventSchema, {
    decode: SchemaGetter.transform(
      ([
        timestamp,
        type,
        dungeonName,
        keyLevel,
        zoneId,
        affixIds,
        unmappedFlag,
        startedAt,
      ]) => {
        return {
          affixIds,
          dungeonName,
          keyLevel,
          startedAt,
          timestamp,
          type,
          unmappedFlag,
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
        event.unmappedFlag,
        event.startedAt,
        "",
      ] as const;
    }),
  }),
);

export type DungeonStartEvent = typeof DungeonStartEventFromLogSchema.Type;

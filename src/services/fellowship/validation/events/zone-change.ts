import { SchemaGetter } from "effect";
import * as Schema from "effect/Schema";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import {
  DungeonNameSchema,
  KeyLevelSchema,
  TimestampSchema,
  ZoneIdSchema,
} from "@/services/fellowship/validation/common.ts";
import {
  EmptyStringSchema,
  IntegerFromStringSchema,
  JsonStringSchema,
} from "@/validation/common.ts";

const ZoneChangeLogLineSchema = Schema.Tuple([
  Schema.DateTimeUtcFromString,
  Schema.Literal(FELLOWSHIP_EVENT.ZONE_CHANGE),
  JsonStringSchema,
  IntegerFromStringSchema,
  IntegerFromStringSchema,
  EmptyStringSchema,
]);

const ZoneChangeEventSchema = Schema.Struct({
  dungeonName: DungeonNameSchema,
  keyLevel: KeyLevelSchema,
  timestamp: TimestampSchema,
  type: Schema.Literal(FELLOWSHIP_EVENT.ZONE_CHANGE),
  zoneId: ZoneIdSchema,
});

export const ZoneChangeEventFromLogSchema = ZoneChangeLogLineSchema.pipe(
  Schema.decodeTo(ZoneChangeEventSchema, {
    decode: SchemaGetter.transform(
      ([timestamp, type, dungeonName, keyLevel, zoneId]) => {
        return {
          dungeonName,
          keyLevel,
          timestamp,
          type,
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
        "",
      ] as const;
    }),
  }),
);

export type ZoneChangeEvent = typeof ZoneChangeEventFromLogSchema.Type;

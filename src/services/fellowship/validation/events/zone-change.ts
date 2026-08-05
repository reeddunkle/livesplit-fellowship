import { SchemaGetter } from "effect";
import * as Schema from "effect/Schema";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import {
  DungeonIdSchema,
  DungeonNameSchema,
  InstanceIdSchema,
  TimestampSchema,
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
  dungeonId: DungeonIdSchema,
  dungeonName: DungeonNameSchema,
  instanceId: InstanceIdSchema,
  timestamp: TimestampSchema,
  type: Schema.Literal(FELLOWSHIP_EVENT.ZONE_CHANGE),
});

export const ZoneChangeEventFromLogSchema = ZoneChangeLogLineSchema.pipe(
  Schema.decodeTo(ZoneChangeEventSchema, {
    decode: SchemaGetter.transform(
      ([timestamp, type, dungeonName, dungeonId, instanceId]) => {
        return {
          dungeonId,
          dungeonName,
          instanceId,
          timestamp,
          type,
        };
      },
    ),
    encode: SchemaGetter.transform((event) => {
      return [
        event.timestamp,
        event.type,
        event.dungeonName,
        event.dungeonId,
        event.instanceId,
        "",
      ] as const;
    }),
  }),
);

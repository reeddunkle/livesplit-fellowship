import { SchemaGetter } from "effect";
import * as Schema from "effect/Schema";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import {
  DungeonAffixIdsSchema,
  DungeonIdSchema,
  DungeonNameSchema,
  InstanceIdSchema,
  TimestampSchema,
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
  dungeonId: DungeonIdSchema,
  dungeonName: DungeonNameSchema,
  instanceId: InstanceIdSchema,
  startedAt: Schema.DateTimeUtc,
  timestamp: TimestampSchema,
  type: Schema.Literal(FELLOWSHIP_EVENT.DUNGEON_START),
  unmappedFlag: Schema.Boolean,
});

export const DungeonStartEventFromLogSchema = DungeonStartLogLineSchema.pipe(
  Schema.decodeTo(DungeonStartEventSchema, {
    decode: SchemaGetter.transform(
      ([
        timestamp,
        type,
        dungeonName,
        dungeonId,
        instanceId,
        affixIds,
        unmappedFlag,
        startedAt,
      ]) => {
        return {
          affixIds,
          dungeonId,
          dungeonName,
          instanceId,
          startedAt,
          timestamp,
          type,
          unmappedFlag,
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
        event.affixIds,
        event.unmappedFlag,
        event.startedAt,
        "",
      ] as const;
    }),
  }),
);

import * as Schema from "effect/Schema";

export const TimestampSchema = Schema.DateTimeUtc;
export const DungeonNameSchema = Schema.String;
export const ZoneIdSchema = Schema.Int;
export const KeyLevelSchema = Schema.Int;
export const EncounterIdSchema = Schema.Int;
export const DungeonAffixIdsSchema = Schema.Array(Schema.Int);

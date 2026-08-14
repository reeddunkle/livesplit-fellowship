import * as Schema from "effect/Schema";

export const TimestampSchema = Schema.DateTimeUtc;
export const DungeonNameSchema = Schema.String;
export const InstanceIdSchema = Schema.String;
export const DungeonIdSchema = Schema.String;
export const EncounterIdSchema = Schema.String;
export const DungeonAffixIdsSchema = Schema.Array(Schema.String);

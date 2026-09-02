import * as Schema from "effect/Schema";

import { NonEmptyStringSchema } from "@/validation/common-schemas.ts";

const ExternalMobDataEntrySchema = Schema.Struct({
  DevKey: NonEmptyStringSchema,
  DevName: NonEmptyStringSchema,
  DevZoneName: NonEmptyStringSchema,
  FoundInZoneFSLIDs: Schema.Array(Schema.Number),
  FoundInZoneGameIDs: Schema.Array(Schema.Number),
  FSLName: NonEmptyStringSchema,
  KillScore: Schema.NullOr(Schema.Number),
  PlacedInZones: Schema.Array(NonEmptyStringSchema),
});

// type ExternalMobDataEntry = typeof ExternalMobDataEntrySchema.Type;

export const ExternalMobDataSchema = Schema.Record(
  NonEmptyStringSchema,
  ExternalMobDataEntrySchema,
);

export type ExternalMobData = typeof ExternalMobDataSchema.Type;

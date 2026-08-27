import * as Schema from "effect/Schema";

import { DungeonIdSchema } from "@/services/fellowship/validation/fellowship-common.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const EncounterApiEncounterSchema = Schema.Struct({
  dungeonId: DungeonIdSchema,
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
});

export type EncounterApiEncounter = typeof EncounterApiEncounterSchema.Type;

export const EncounterApiEncounterListSchema = Schema.Array(
  EncounterApiEncounterSchema,
);

export type EncounterApiEncounterList =
  typeof EncounterApiEncounterListSchema.Type;

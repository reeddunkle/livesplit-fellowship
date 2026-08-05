import * as Schema from "effect/Schema";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import {
  NonEmptyStringSchema,
  PositiveIntegerSchema,
} from "@/validation/common.ts";

const FellowshipDungeonKeySchema = Schema.Union([
  Schema.Literal("CITHRELS_FALL"),
  Schema.Literal("EMPYREAN_SANDS"),
  Schema.Literal("EVERDAWN_GROVE"),
  Schema.Literal("GODFALL_QUARRY"),
  Schema.Literal("HEART_OF_TUZARI"),
  Schema.Literal("RANSACK_OF_DRAKHEIM"),
  Schema.Literal("RUINS_OF_REGATH"),
  Schema.Literal("SAILORS_ABYSS"),
  Schema.Literal("SILKEN_HOLLOW"),
  Schema.Literal("STORMWATCH"),
]);

const DungeonStartMilestoneRequirementSchema = Schema.Struct({
  type: Schema.Literal(FELLOWSHIP_EVENT.DUNGEON_START),
});

const DungeonEndMilestoneRequirementSchema = Schema.Struct({
  type: Schema.Literal(FELLOWSHIP_EVENT.DUNGEON_END),
});

const EncounterStartMilestoneRequirementSchema = Schema.Struct({
  encounterId: PositiveIntegerSchema,
  type: Schema.Literal(FELLOWSHIP_EVENT.ENCOUNTER_START),
});

const EncounterEndMilestoneRequirementSchema = Schema.Struct({
  encounterId: PositiveIntegerSchema,
  type: Schema.Literal(FELLOWSHIP_EVENT.ENCOUNTER_END),
});

const UnitDeathMilestoneRequirementSchema = Schema.Struct({
  type: Schema.Literal(FELLOWSHIP_EVENT.UNIT_DEATH),
  unitTypeId: PositiveIntegerSchema,
});

export const FellowshipMilestoneRequirementSchema = Schema.Union([
  DungeonEndMilestoneRequirementSchema,
  DungeonStartMilestoneRequirementSchema,
  EncounterEndMilestoneRequirementSchema,
  EncounterStartMilestoneRequirementSchema,
  UnitDeathMilestoneRequirementSchema,
]);

export const FellowshipMilestoneDefinitionSchema = Schema.Struct({
  label: NonEmptyStringSchema,
  milestoneId: NonEmptyStringSchema,
  requirements: Schema.NonEmptyArray(FellowshipMilestoneRequirementSchema),
});

export const FellowshipMilestoneConfigurationFileSchema = Schema.Struct({
  dungeonKey: FellowshipDungeonKeySchema,
  milestones: Schema.Array(FellowshipMilestoneDefinitionSchema),
});

export type FellowshipMilestoneConfigurationFile =
  typeof FellowshipMilestoneConfigurationFileSchema.Type;

import * as Schema from "effect/Schema";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";
import {
  NonEmptyStringSchema,
  PositiveIntegerSchema,
} from "@/validation/common.ts";

export const FellowshipDungeonKeySchema = Schema.Union([
  Schema.Literal("CITHRELS_FALL"),
  Schema.Literal("EMPYREAN_SANDS"),
  Schema.Literal("EVERDAWN_GROVE"),
  Schema.Literal("GODFALL_QUARRY"),
  Schema.Literal("HEART_OF_TUZARI"),
  Schema.Literal("RANSACK_OF_DRAKHEIM"),
  Schema.Literal("RUINS_OF_REGATH"),
  Schema.Literal("SAILORS_ABYSS"),
  Schema.Literal("SCRYERS_PEAK"),
  Schema.Literal("SILKEN_HOLLOW"),
  Schema.Literal("STORMWATCH"),
  Schema.Literal("URRAK_MARKETS"),
  Schema.Literal("WRAITHTIDE_VAULT"),
  Schema.Literal("WYRMHEART"),
  Schema.Literal("XUL_THE_BLOOD_MONOLITH"),
]);

export type FellowshipDungeonKey = typeof FellowshipDungeonKeySchema.Type;

export const AbilityActivatedMilestoneRequirementSchema = Schema.Struct({
  abilityId: PositiveIntegerSchema,
  type: Schema.Literal(FELLOWSHIP_EVENT.ABILITY_ACTIVATED),
});

export type AbilityActivatedMilestoneRequirement =
  typeof AbilityActivatedMilestoneRequirementSchema.Type;

export const DungeonStartMilestoneRequirementSchema = Schema.Struct({
  type: Schema.Literal(FELLOWSHIP_EVENT.DUNGEON_START),
});

export type DungeonStartMilestoneRequirement =
  typeof DungeonStartMilestoneRequirementSchema.Type;

export const DungeonEndMilestoneRequirementSchema = Schema.Struct({
  type: Schema.Literal(FELLOWSHIP_EVENT.DUNGEON_END),
});

export type DungeonEndMilestoneRequirement =
  typeof DungeonEndMilestoneRequirementSchema.Type;

export const EncounterStartMilestoneRequirementSchema = Schema.Struct({
  encounterId: PositiveIntegerSchema,
  type: Schema.Literal(FELLOWSHIP_EVENT.ENCOUNTER_START),
});

export type EncounterStartMilestoneRequirement =
  typeof EncounterStartMilestoneRequirementSchema.Type;

export const EncounterEndMilestoneRequirementSchema = Schema.Struct({
  encounterId: PositiveIntegerSchema,
  type: Schema.Literal(FELLOWSHIP_EVENT.ENCOUNTER_END),
});

export type EncounterEndMilestoneRequirement =
  typeof EncounterEndMilestoneRequirementSchema.Type;

export const UnitDeathMilestoneRequirementSchema = Schema.Struct({
  type: Schema.Literal(FELLOWSHIP_EVENT.UNIT_DEATH),
  unitTypeId: PositiveIntegerSchema,
});

export type UnitDeathMilestoneRequirement =
  typeof UnitDeathMilestoneRequirementSchema.Type;

export const FellowshipMilestoneRequirementSchema = Schema.Union([
  AbilityActivatedMilestoneRequirementSchema,
  DungeonEndMilestoneRequirementSchema,
  DungeonStartMilestoneRequirementSchema,
  EncounterEndMilestoneRequirementSchema,
  EncounterStartMilestoneRequirementSchema,
  UnitDeathMilestoneRequirementSchema,
]);

export type FellowshipMilestoneRequirement =
  typeof FellowshipMilestoneRequirementSchema.Type;

export const TargetElapsedTimeSchema = Schema.String.check(
  Schema.isPattern(/^\d{2}:[0-5]\d:[0-5]\d$/),
);

export type TargetElapsedTime = typeof TargetElapsedTimeSchema.Type;

export const FellowshipMilestoneDefinitionSchema = Schema.Struct({
  label: NonEmptyStringSchema,
  milestoneId: NonEmptyStringSchema,
  requirements: Schema.NonEmptyArray(FellowshipMilestoneRequirementSchema),
  targetElapsedTime: Schema.optional(TargetElapsedTimeSchema),
});

export type FellowshipMilestoneDefinition =
  typeof FellowshipMilestoneDefinitionSchema.Type;

export const FellowshipMilestoneConfigurationFileSchema = Schema.Struct({
  dungeonKey: FellowshipDungeonKeySchema,
  milestones: Schema.Array(FellowshipMilestoneDefinitionSchema),
});

export type FellowshipMilestoneConfigurationFile =
  typeof FellowshipMilestoneConfigurationFileSchema.Type;

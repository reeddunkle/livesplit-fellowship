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
  Schema.Literal("SCRYERS_PEAK"),
  Schema.Literal("SILKEN_HOLLOW"),
  Schema.Literal("STORMWATCH"),
  Schema.Literal("URRAK_MARKETS"),
  Schema.Literal("WRAITHTIDE_VAULT"),
  Schema.Literal("WYRMHEART"),
  Schema.Literal("XUL_THE_BLOOD_MONOLITH"),
]);

const RequirementOccurrenceFields = {
  requiredCount: PositiveIntegerSchema,
  startOccurrence: PositiveIntegerSchema,
};

const AbilityActivatedMilestoneRequirementSchema = Schema.Struct({
  abilityId: NonEmptyStringSchema,
  ...RequirementOccurrenceFields,
  type: Schema.Literal(FELLOWSHIP_EVENT.ABILITY_ACTIVATED),
});

const DungeonStartMilestoneRequirementSchema = Schema.Struct({
  ...RequirementOccurrenceFields,
  type: Schema.Literal(FELLOWSHIP_EVENT.DUNGEON_START),
});

const DungeonEndMilestoneRequirementSchema = Schema.Struct({
  ...RequirementOccurrenceFields,
  type: Schema.Literal(FELLOWSHIP_EVENT.DUNGEON_END),
});

const EncounterStartMilestoneRequirementSchema = Schema.Struct({
  encounterId: NonEmptyStringSchema,
  ...RequirementOccurrenceFields,
  type: Schema.Literal(FELLOWSHIP_EVENT.ENCOUNTER_START),
});

const EncounterEndMilestoneRequirementSchema = Schema.Struct({
  encounterId: NonEmptyStringSchema,
  ...RequirementOccurrenceFields,
  type: Schema.Literal(FELLOWSHIP_EVENT.ENCOUNTER_END),
});

const UnitDeathMilestoneRequirementSchema = Schema.Struct({
  ...RequirementOccurrenceFields,
  type: Schema.Literal(FELLOWSHIP_EVENT.UNIT_DEATH),
  unitTypeId: NonEmptyStringSchema,
});

const FellowshipMilestoneRequirementSchema = Schema.Union([
  AbilityActivatedMilestoneRequirementSchema,
  DungeonEndMilestoneRequirementSchema,
  DungeonStartMilestoneRequirementSchema,
  EncounterEndMilestoneRequirementSchema,
  EncounterStartMilestoneRequirementSchema,
  UnitDeathMilestoneRequirementSchema,
]);

export type FellowshipMilestoneRequirement =
  typeof FellowshipMilestoneRequirementSchema.Type;

const FellowshipMilestoneDefinitionSchema = Schema.Struct({
  label: NonEmptyStringSchema,
  requirements: Schema.NonEmptyArray(FellowshipMilestoneRequirementSchema),
});

export type FellowshipMilestoneDefinition =
  typeof FellowshipMilestoneDefinitionSchema.Type;

export const FellowshipMilestoneConfigurationFileSchema = Schema.Struct({
  dungeonKey: FellowshipDungeonKeySchema,
  milestones: Schema.Array(FellowshipMilestoneDefinitionSchema),
});

export type FellowshipMilestoneConfigurationFile =
  typeof FellowshipMilestoneConfigurationFileSchema.Type;

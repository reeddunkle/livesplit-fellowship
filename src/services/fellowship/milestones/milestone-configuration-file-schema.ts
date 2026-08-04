import * as Schema from "effect/Schema";

import {
  NonEmptyStringSchema,
  PositiveIntegerSchema,
} from "@/validation/common.ts";

const DungeonStartedMilestoneTriggerSchema = Schema.Struct({
  type: Schema.Literal("DUNGEON_START"),
});

const DungeonEndedMilestoneTriggerSchema = Schema.Struct({
  type: Schema.Literal("DUNGEON_END"),
});

const EncounterStartedMilestoneTriggerSchema = Schema.Struct({
  encounterId: PositiveIntegerSchema,
  type: Schema.Literal("ENCOUNTER_START"),
});

const EncounterEndedMilestoneTriggerSchema = Schema.Struct({
  encounterId: PositiveIntegerSchema,
  type: Schema.Literal("ENCOUNTER_END"),
});

const UnitDeathMilestoneTriggerSchema = Schema.Struct({
  occurrence: PositiveIntegerSchema,
  type: Schema.Literal("UNIT_DEATH"),
  unitTypeId: PositiveIntegerSchema,
});

const FellowshipMilestoneTriggerSchema = Schema.Union([
  DungeonEndedMilestoneTriggerSchema,
  DungeonStartedMilestoneTriggerSchema,
  EncounterEndedMilestoneTriggerSchema,
  EncounterStartedMilestoneTriggerSchema,
  UnitDeathMilestoneTriggerSchema,
]);

const FellowshipMilestoneDefinitionSchema = Schema.Struct({
  label: NonEmptyStringSchema,
  milestoneId: NonEmptyStringSchema,
  trigger: FellowshipMilestoneTriggerSchema,
});

export const FellowshipMilestoneConfigurationFileSchema = Schema.Struct({
  dungeonKey: NonEmptyStringSchema,
  keyLevel: Schema.optionalKey(PositiveIntegerSchema),
  milestones: Schema.Array(FellowshipMilestoneDefinitionSchema),
});

export type FellowshipMilestoneConfigurationFile =
  typeof FellowshipMilestoneConfigurationFileSchema.Type;

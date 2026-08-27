import * as Schema from "effect/Schema";

import {
  DungeonIdSchema,
  DungeonLevelSchema,
} from "@/services/fellowship/validation/fellowship-common.ts";
import { FellowshipMilestoneConfigurationFileSchema } from "@/services/fellowship/validation/milestone-configuration-file-schema.ts";
import { MilestoneRequirementEventTypeSchema } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";
import {
  NonEmptyStringSchema,
  PositiveIntegerSchema,
  UUID7Schema,
} from "@/validation/common.ts";

export const CreateConfigurationApiRequestSchema = Schema.Struct({
  configuration: FellowshipMilestoneConfigurationFileSchema,
});

export type CreateConfigurationApiRequest =
  typeof CreateConfigurationApiRequestSchema.Type;

const ConfigurationApiRequirementSchema = Schema.Struct({
  requiredCount: PositiveIntegerSchema,
  startOccurrence: PositiveIntegerSchema,
  targetId: NonEmptyStringSchema,
  type: MilestoneRequirementEventTypeSchema,
});

export type ConfigurationApiRequirement =
  typeof ConfigurationApiRequirementSchema.Type;

const ConfigurationApiMilestoneSchema = Schema.Struct({
  label: NonEmptyStringSchema,
  requirements: Schema.NonEmptyArray(ConfigurationApiRequirementSchema),
});

export type ConfigurationApiMilestone =
  typeof ConfigurationApiMilestoneSchema.Type;

export const ConfigurationApiConfigurationSchema = Schema.Struct({
  dungeonId: DungeonIdSchema,
  dungeonLevel: DungeonLevelSchema,
  id: UUID7Schema,
  milestones: Schema.Array(ConfigurationApiMilestoneSchema),
});

export type ConfigurationApiConfiguration =
  typeof ConfigurationApiConfigurationSchema.Type;

export const ConfigurationApiConfigurationListSchema = Schema.Array(
  ConfigurationApiConfigurationSchema,
);

export type ConfigurationApiConfigurationList =
  typeof ConfigurationApiConfigurationListSchema.Type;

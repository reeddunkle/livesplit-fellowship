import * as Schema from "effect/Schema";

import { RequirementEventTypeSchema } from "@/services/fellowship/validation/requirement-event-type-schema.ts";
import {
  NonEmptyStringSchema,
  PositiveIntegerSchema,
} from "@/validation/common-schemas.ts";

const TimestampMillisecondsSchema = PositiveIntegerSchema;

const DungeonRunRequirementObservationApiSchema = Schema.Struct({
  timestampMilliseconds: TimestampMillisecondsSchema,
});

const DungeonRunRequirementApiSchema = Schema.Struct({
  observations: Schema.Array(DungeonRunRequirementObservationApiSchema),
  requiredCount: PositiveIntegerSchema,
  startOccurrence: PositiveIntegerSchema,
  targetId: NonEmptyStringSchema,
  type: RequirementEventTypeSchema,
});

const DungeonRunMilestoneApiSchema = Schema.Struct({
  completedAtMilliseconds: Schema.NullOr(TimestampMillisecondsSchema),
  elapsedMilliseconds: Schema.NullOr(TimestampMillisecondsSchema),
  label: NonEmptyStringSchema,
  milestoneId: NonEmptyStringSchema,
  requirements: Schema.Array(DungeonRunRequirementApiSchema),
});

const DungeonRunApiSchema = Schema.Struct({
  startedAtMilliseconds: TimestampMillisecondsSchema,
});

const DungeonRunStateApiSchema = Schema.Struct({
  dungeonRun: Schema.NullOr(DungeonRunApiSchema),
  milestones: Schema.Array(DungeonRunMilestoneApiSchema),
});

export const DungeonRunApiMessageSchema = Schema.Struct({
  state: DungeonRunStateApiSchema,
  version: Schema.Literal(1),
});

export type DungeonRunMilestoneApi = typeof DungeonRunMilestoneApiSchema.Type;

export type DungeonRunRequirementApi =
  typeof DungeonRunRequirementApiSchema.Type;

export type DungeonRunStateApi = typeof DungeonRunStateApiSchema.Type;

export type DungeonRunApiMessage = typeof DungeonRunApiMessageSchema.Type;

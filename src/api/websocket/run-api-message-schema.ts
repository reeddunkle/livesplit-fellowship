import * as Schema from "effect/Schema";

import { MilestoneRequirementEventTypeSchema } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";
import {
  NonEmptyStringSchema,
  PositiveIntegerSchema,
} from "@/validation/common.ts";

const TimestampMillisecondsSchema = PositiveIntegerSchema;

const RunApiRequirementObservationSchema = Schema.Struct({
  timestampMilliseconds: TimestampMillisecondsSchema,
});

const RunApiRequirementSchema = Schema.Struct({
  observations: Schema.Array(RunApiRequirementObservationSchema),
  requiredCount: PositiveIntegerSchema,
  startOccurrence: PositiveIntegerSchema,
  targetId: NonEmptyStringSchema,
  type: MilestoneRequirementEventTypeSchema,
});

const RunApiMilestoneSchema = Schema.Struct({
  completedAtMilliseconds: Schema.NullOr(TimestampMillisecondsSchema),
  elapsedMilliseconds: Schema.NullOr(TimestampMillisecondsSchema),
  label: NonEmptyStringSchema,
  milestoneId: NonEmptyStringSchema,
  requirements: Schema.Array(RunApiRequirementSchema),
});

const RunApiRunSchema = Schema.Struct({
  startedAtMilliseconds: TimestampMillisecondsSchema,
});

const RunApiStateSchema = Schema.Struct({
  milestones: Schema.Array(RunApiMilestoneSchema),
  run: Schema.NullOr(RunApiRunSchema),
});

export const RunApiMessageSchema = Schema.Struct({
  state: RunApiStateSchema,
  version: Schema.Literal(1),
});

export type RunApiMilestone = typeof RunApiMilestoneSchema.Type;

export type RunApiRequirement = typeof RunApiRequirementSchema.Type;

export type RunApiState = typeof RunApiStateSchema.Type;

export type RunApiMessage = typeof RunApiMessageSchema.Type;

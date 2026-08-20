import * as Schema from "effect/Schema";

import { MilestoneRequirementEventTypeSchema } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

const RunApiRequirementObservationSchema = Schema.Struct({
  timestampMilliseconds: Schema.Number,
});

const RunApiRequirementSchema = Schema.Struct({
  id: Schema.String,
  observations: Schema.Array(RunApiRequirementObservationSchema),
  requiredCount: Schema.Number,
  type: MilestoneRequirementEventTypeSchema,
});

const RunApiMilestoneSchema = Schema.Struct({
  completedAtMilliseconds: Schema.NullOr(Schema.Number),
  elapsedMilliseconds: Schema.NullOr(Schema.Number),
  label: Schema.String,
  milestoneId: Schema.String,
  requirements: Schema.Array(RunApiRequirementSchema),
});

const RunApiStateSchema = Schema.Struct({
  milestones: Schema.Array(RunApiMilestoneSchema),
  run: Schema.NullOr(
    Schema.Struct({
      startedAtMilliseconds: Schema.Number,
    }),
  ),
});

export const RunApiMessageSchema = Schema.Struct({
  state: RunApiStateSchema,
  version: Schema.Literal(1),
});

export type RunApiMilestone = typeof RunApiMilestoneSchema.Type;

export type RunApiRequirement = typeof RunApiRequirementSchema.Type;

export type RunApiState = typeof RunApiStateSchema.Type;

export type RunApiMessage = typeof RunApiMessageSchema.Type;

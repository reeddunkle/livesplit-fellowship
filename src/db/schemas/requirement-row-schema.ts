import * as Schema from "effect/Schema";

import { MilestoneRequirementEventTypeSchema } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";
import {
  NonEmptyStringSchema,
  PositiveIntegerSchema,
} from "@/validation/common.ts";

export const RequirementRowSchema = Schema.Struct({
  id: NonEmptyStringSchema,
  milestoneId: NonEmptyStringSchema,
  requiredCount: PositiveIntegerSchema,
  startOccurrence: PositiveIntegerSchema,
  targetId: NonEmptyStringSchema,
  type: MilestoneRequirementEventTypeSchema,
});

export type RequirementRow = typeof RequirementRowSchema.Type;

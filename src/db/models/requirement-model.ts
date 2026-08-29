import * as Schema from "effect/Schema";
import * as Model from "effect/unstable/schema/Model";

import { MilestoneIdSchema } from "@/db/models/milestone-model.ts";
import { MilestoneRequirementEventTypeSchema } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";
import {
  NonEmptyStringSchema,
  PositiveIntegerSchema,
} from "@/validation/common.ts";

const RequirementIdSchema = Schema.String.pipe(Schema.brand("RequirementId"));

export class RequirementModel extends Model.Class<RequirementModel>(
  "RequirementModel",
)({
  createdAt: Model.DateTimeInsertFromNumber,
  id: Model.UuidV7Insert(RequirementIdSchema),
  milestoneId: MilestoneIdSchema,
  requiredCount: PositiveIntegerSchema,
  startOccurrence: PositiveIntegerSchema,
  targetId: NonEmptyStringSchema,
  type: MilestoneRequirementEventTypeSchema,
  updatedAt: Model.DateTimeInsertFromNumber,
}) {}

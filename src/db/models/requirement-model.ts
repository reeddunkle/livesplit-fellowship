import * as Model from "effect/unstable/schema/Model";

import { MilestoneRequirementEventTypeSchema } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";
import {
  NonEmptyStringSchema,
  PositiveIntegerSchema,
} from "@/validation/common-schemas.ts";
import { ConfigurationDefinitionIdSchema } from "@/validation/configuration/configuration-definition-id-schema.ts";
import { RequirementIdSchema } from "@/validation/requirement/requirement-id-schema.ts";

export class RequirementModel extends Model.Class<RequirementModel>(
  "RequirementModel",
)({
  configurationDefinitionId: ConfigurationDefinitionIdSchema,
  createdAt: Model.DateTimeInsertFromNumber,
  id: Model.UuidV7Insert(RequirementIdSchema),
  requiredCount: PositiveIntegerSchema,
  startOccurrence: PositiveIntegerSchema,
  targetId: NonEmptyStringSchema,
  type: MilestoneRequirementEventTypeSchema,
  updatedAt: Model.DateTimeUpdateFromNumber,
}) {}

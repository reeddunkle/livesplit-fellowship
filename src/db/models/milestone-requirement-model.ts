import * as Model from "effect/unstable/schema/Model";

import { MilestoneIdSchema } from "@/db/models/milestone-model.ts";
import { RequirementIdSchema } from "@/db/models/requirement-model.ts";

export class MilestoneRequirementModel extends Model.Class<MilestoneRequirementModel>(
  "MilestoneRequirementModel",
)({
  createdAt: Model.DateTimeInsertFromNumber,
  milestoneId: MilestoneIdSchema,
  requirementId: RequirementIdSchema,
}) {}

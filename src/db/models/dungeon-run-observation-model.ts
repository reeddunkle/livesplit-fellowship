import * as Schema from "effect/Schema";
import * as Model from "effect/unstable/schema/Model";

import { DungeonRunIdSchema } from "@/db/models/dungeon-run-model.ts";
import { MilestoneRequirementEventTypeSchema } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";
import {
  NonEmptyStringSchema,
  PositiveIntegerSchema,
} from "@/validation/common.ts";

export class DungeonRunObservationModel extends Model.Class<DungeonRunObservationModel>(
  "DungeonRunObservationModel",
)({
  createdAt: Model.DateTimeInsertFromNumber,
  dungeonRunId: DungeonRunIdSchema,
  observedAt: Schema.DateTimeUtcFromMillis,
  occurrence: PositiveIntegerSchema,
  targetId: NonEmptyStringSchema,
  type: MilestoneRequirementEventTypeSchema,
}) {}

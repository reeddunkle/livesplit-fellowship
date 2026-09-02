import * as Schema from "effect/Schema";
import * as Model from "effect/unstable/schema/Model";

import { MilestoneRequirementEventTypeSchema } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";
import {
  NonEmptyStringSchema,
  PositiveIntegerSchema,
} from "@/validation/common-schemas.ts";
import { DungeonRunIdSchema } from "@/validation/dungeon-run/dungeon-run-id-schema.ts";

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

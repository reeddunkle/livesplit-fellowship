import * as Schema from "effect/Schema";
import * as Model from "effect/unstable/schema/Model";

import { DungeonIdSchema } from "@/services/fellowship/validation/fellowship-common.ts";
import { PositiveIntegerSchema } from "@/validation/common.ts";
import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id.ts";

export const DungeonRunIdSchema = Schema.String.pipe(
  Schema.brand("DungeonRunId"),
);

export type DungeonRunId = typeof DungeonRunIdSchema.Type;

export const DungeonRunStatusSchema = Schema.Literals([
  "ACTIVE",
  "COMPLETED",
  "EXITED",
]);

export type DungeonRunStatus = typeof DungeonRunStatusSchema.Type;

export class DungeonRunModel extends Model.Class<DungeonRunModel>(
  "DungeonRunModel",
)({
  configurationId: Schema.NullOr(ConfigurationIdSchema),
  createdAt: Model.DateTimeInsertFromNumber,
  dungeonId: DungeonIdSchema,
  dungeonLevel: PositiveIntegerSchema,
  endedAt: Schema.NullOr(Schema.DateTimeUtcFromMillis),
  id: Model.UuidV7Insert(DungeonRunIdSchema),
  startedAt: Schema.DateTimeUtcFromMillis,
  status: DungeonRunStatusSchema,
  updatedAt: Model.DateTimeUpdateFromNumber,
}) {}

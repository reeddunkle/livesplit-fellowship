import * as Schema from "effect/Schema";
import * as Model from "effect/unstable/schema/Model";

import { DungeonIdSchema } from "@/services/fellowship/validation/fellowship-common.ts";
import { PositiveIntegerSchema } from "@/validation/common-schemas.ts";
import { ConfigurationDefinitionIdSchema } from "@/validation/configuration/configuration-definition-id-schema.ts";

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
  configurationDefinitionId: ConfigurationDefinitionIdSchema,
  createdAt: Model.DateTimeInsertFromNumber,
  dungeonId: DungeonIdSchema,
  dungeonLevel: PositiveIntegerSchema,
  endedAt: Schema.NullOr(Schema.DateTimeUtcFromMillis),
  id: Model.UuidV7Insert(DungeonRunIdSchema),
  startedAt: Schema.DateTimeUtcFromMillis,
  status: DungeonRunStatusSchema,
  updatedAt: Model.DateTimeUpdateFromNumber,
}) {}

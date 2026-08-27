import * as Schema from "effect/Schema";
import * as Model from "effect/unstable/schema/Model";

import { DungeonIdSchema } from "@/services/fellowship/validation/fellowship-common.ts";
import {
  NonEmptyStringSchema,
  PositiveIntegerSchema,
} from "@/validation/common.ts";
import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id.ts";

export class ConfigurationModel extends Model.Class<ConfigurationModel>(
  "ConfigurationModel",
)({
  canonicalJson: Schema.String,
  createdAt: Model.DateTimeInsertFromNumber,
  dungeonId: DungeonIdSchema,
  dungeonLevel: PositiveIntegerSchema,
  fingerprint: NonEmptyStringSchema,
  id: Model.UuidV7Insert(ConfigurationIdSchema),
}) {}

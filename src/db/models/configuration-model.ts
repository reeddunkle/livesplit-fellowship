import * as Schema from "effect/Schema";
import * as Model from "effect/unstable/schema/Model";

import { DungeonIdSchema } from "@/services/fellowship/validation/fellowship-common.ts";
import { PositiveIntegerSchema } from "@/validation/common-schemas.ts";
import { ConfigurationFingerprintSchema } from "@/validation/configuration/configuration-fingerprint-schema.ts";
import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id-schema.ts";
import { ConfigurationLabelSchema } from "@/validation/configuration/configuration-label-schema.ts";

export class ConfigurationModel extends Model.Class<ConfigurationModel>(
  "ConfigurationModel",
)({
  canonicalJson: Schema.String,
  createdAt: Model.DateTimeInsertFromNumber,
  dungeonId: DungeonIdSchema,
  dungeonLevel: PositiveIntegerSchema,
  fingerprint: ConfigurationFingerprintSchema,
  id: Model.UuidV7Insert(ConfigurationIdSchema),
  label: ConfigurationLabelSchema,
  updatedAt: Model.DateTimeUpdateFromNumber,
}) {}

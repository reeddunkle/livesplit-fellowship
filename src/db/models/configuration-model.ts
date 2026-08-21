import * as Schema from "effect/Schema";
import * as Model from "effect/unstable/schema/Model";

import { NonEmptyStringSchema } from "@/validation/common.ts";

export const ConfigurationIdSchema = Schema.String.pipe(
  Schema.brand("ConfigurationId"),
);

export type ConfigurationId = typeof ConfigurationIdSchema.Type;

export class ConfigurationModel extends Model.Class<ConfigurationModel>(
  "ConfigurationModel",
)({
  canonicalJson: Schema.String,
  createdAt: Model.DateTimeInsert,
  dungeonKey: NonEmptyStringSchema,
  fingerprint: NonEmptyStringSchema,
  id: Model.UuidV7Insert(ConfigurationIdSchema),
}) {}

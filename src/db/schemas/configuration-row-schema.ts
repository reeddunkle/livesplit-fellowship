import * as Schema from "effect/Schema";

import { NonEmptyStringSchema } from "@/validation/common.ts";

export const ConfigurationRowSchema = Schema.Struct({
  canonicalJson: Schema.String,
  createdAtMilliseconds: Schema.Number,
  dungeonKey: NonEmptyStringSchema,
  fingerprint: NonEmptyStringSchema,
  id: NonEmptyStringSchema,
});

export type ConfigurationRow = typeof ConfigurationRowSchema.Type;

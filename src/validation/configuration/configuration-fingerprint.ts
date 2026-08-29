import * as Schema from "effect/Schema";

import { NonEmptyStringSchema } from "@/validation/common.ts";

export const ConfigurationFingerprintSchema = NonEmptyStringSchema.pipe(
  Schema.brand("ConfigurationFingerprint"),
);

export type ConfigurationFingerprint =
  typeof ConfigurationFingerprintSchema.Type;

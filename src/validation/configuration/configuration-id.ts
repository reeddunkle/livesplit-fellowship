import * as Schema from "effect/Schema";

import { UUID7Schema } from "@/validation/common.ts";

export const ConfigurationIdSchema = UUID7Schema.pipe(
  Schema.brand("ConfigurationId"),
);

export type ConfigurationId = typeof ConfigurationIdSchema.Type;

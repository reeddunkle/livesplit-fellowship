import * as Schema from "effect/Schema";

import { NonEmptyStringSchema } from "@/validation/common.ts";

export const MilestoneRowSchema = Schema.Struct({
  configurationId: NonEmptyStringSchema,
  id: NonEmptyStringSchema,
  label: NonEmptyStringSchema,
});

export type MilestoneRow = typeof MilestoneRowSchema.Type;

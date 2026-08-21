import * as Schema from "effect/Schema";
import * as Model from "effect/unstable/schema/Model";

import { ConfigurationIdSchema } from "@/db/models/configuration-model.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const MilestoneIdSchema = Schema.String.pipe(
  Schema.brand("MilestoneId"),
);

export type MilestoneId = typeof MilestoneIdSchema.Type;

export class MilestoneModel extends Model.Class<MilestoneModel>(
  "MilestoneModel",
)({
  configurationId: ConfigurationIdSchema,
  id: Model.UuidV7Insert(MilestoneIdSchema),
  label: NonEmptyStringSchema,
}) {}

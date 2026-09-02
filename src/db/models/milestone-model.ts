import * as Schema from "effect/Schema";
import * as Model from "effect/unstable/schema/Model";

import { NonEmptyStringSchema } from "@/validation/common-schemas.ts";
import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id-schema.ts";

export const MilestoneIdSchema = Schema.String.pipe(
  Schema.brand("MilestoneId"),
);

export type MilestoneId = typeof MilestoneIdSchema.Type;

export class MilestoneModel extends Model.Class<MilestoneModel>(
  "MilestoneModel",
)({
  configurationId: ConfigurationIdSchema,
  createdAt: Model.DateTimeInsertFromNumber,
  id: Model.UuidV7Insert(MilestoneIdSchema),
  label: NonEmptyStringSchema,
  updatedAt: Model.DateTimeInsertFromNumber,
}) {}

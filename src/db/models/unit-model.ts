import * as Schema from "effect/Schema";
import * as Model from "effect/unstable/schema/Model";

import { NonEmptyStringSchema } from "@/validation/common.ts";

export const UnitStatusSchema = Schema.Union([
  Schema.Literal("ACTIVE"),
  Schema.Literal("INACTIVE"),
]);

export type UnitStatus = typeof UnitStatusSchema.Type;

export class UnitModel extends Model.Class<UnitModel>("UnitModel")({
  createdAt: Model.DateTimeInsertFromNumber,
  dungeonIds: Schema.Array(NonEmptyStringSchema),
  groupKey: Schema.NullOr(NonEmptyStringSchema),
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  status: UnitStatusSchema,
  updatedAt: Model.DateTimeInsertFromNumber,
  variant: Schema.NullOr(NonEmptyStringSchema),
}) {}

import * as Schema from "effect/Schema";

import { UnitStatusSchema } from "@/db/models/unit-model.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const UnitApiUnitSchema = Schema.Struct({
  dungeonIds: Schema.Array(NonEmptyStringSchema),
  groupKey: Schema.NullOr(NonEmptyStringSchema),
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  status: UnitStatusSchema,
  variant: Schema.NullOr(NonEmptyStringSchema),
});

export type UnitApiUnit = typeof UnitApiUnitSchema.Type;

export const UnitApiUnitListSchema = Schema.Array(UnitApiUnitSchema);

export type UnitApiUnitList = typeof UnitApiUnitListSchema.Type;

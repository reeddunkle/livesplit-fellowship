import * as Schema from "effect/Schema";

import { NonEmptyStringSchema } from "@/validation/common.ts";

export const UnitApiUnitSchema = Schema.Struct({
  dungeonIds: Schema.Array(NonEmptyStringSchema),
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
});

export type UnitApiUnit = typeof UnitApiUnitSchema.Type;

export const UnitApiUnitListSchema = Schema.Array(UnitApiUnitSchema);

export type UnitApiUnitList = typeof UnitApiUnitListSchema.Type;

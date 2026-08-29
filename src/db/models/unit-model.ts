import * as Schema from "effect/Schema";
import * as Model from "effect/unstable/schema/Model";

import { NonEmptyStringSchema } from "@/validation/common.ts";

export class UnitModel extends Model.Class<UnitModel>("UnitModel")({
  dungeonIds: Schema.Array(NonEmptyStringSchema),
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
}) {}

import * as Model from "effect/unstable/schema/Model";

import { NonEmptyStringSchema } from "@/validation/common.ts";

export class UnitModel extends Model.Class<UnitModel>("UnitModel")({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
}) {}

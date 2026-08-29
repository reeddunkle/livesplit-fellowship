import * as Schema from "effect/Schema";
import * as Model from "effect/unstable/schema/Model";

import { NonEmptyStringSchema } from "@/validation/common.ts";

export class AbilityModel extends Model.Class<AbilityModel>("AbilityModel")({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  unitId: Schema.NullOr(NonEmptyStringSchema),
}) {}

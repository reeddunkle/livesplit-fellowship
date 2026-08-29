import * as Schema from "effect/Schema";

import { NonEmptyStringSchema } from "@/validation/common.ts";

export const AbilityApiAbilitySchema = Schema.Struct({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  unitId: Schema.NullOr(NonEmptyStringSchema),
});

export type AbilityApiAbility = typeof AbilityApiAbilitySchema.Type;

export const AbilityApiAbilityListSchema = Schema.Array(
  AbilityApiAbilitySchema,
);

export type AbilityApiAbilityList = typeof AbilityApiAbilityListSchema.Type;

import * as Schema from "effect/Schema";

export const RequirementIdSchema = Schema.String.pipe(
  Schema.brand("RequirementId"),
);

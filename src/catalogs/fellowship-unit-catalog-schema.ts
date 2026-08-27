import * as Schema from "effect/Schema";

import { DungeonIdSchema } from "@/services/fellowship/validation/fellowship-common.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

const FellowshipUnitCatalogEntrySchema = Schema.Struct({
  dungeonIds: Schema.Array(DungeonIdSchema),
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
});

export const FellowshipUnitCatalogSchema = Schema.Array(
  FellowshipUnitCatalogEntrySchema,
);

export type FellowshipUnitCatalog = typeof FellowshipUnitCatalogSchema.Type;

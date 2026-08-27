import * as Schema from "effect/Schema";

import { DungeonIdSchema } from "@/services/fellowship/validation/fellowship-common.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const DungeonApiDungeonSchema = Schema.Struct({
  id: DungeonIdSchema,
  mapId: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
});

export type DungeonApiDungeon = typeof DungeonApiDungeonSchema.Type;

export const DungeonApiDungeonListSchema = Schema.Array(
  DungeonApiDungeonSchema,
);

export type DungeonApiDungeonList = typeof DungeonApiDungeonListSchema.Type;

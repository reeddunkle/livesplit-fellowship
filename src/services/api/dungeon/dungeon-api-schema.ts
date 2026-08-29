import * as Schema from "effect/Schema";

import { DungeonIdSchema } from "@/services/fellowship/validation/fellowship-common.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

export const DungeonApiDungeonSchema = Schema.Struct({
  createdAt: Schema.DateTimeUtc,
  id: DungeonIdSchema,
  mapId: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  updatedAt: Schema.DateTimeUtc,
});

export type DungeonApiDungeon = typeof DungeonApiDungeonSchema.Type;

export const DungeonApiDungeonListSchema = Schema.Array(
  DungeonApiDungeonSchema,
);

export type DungeonApiDungeonList = typeof DungeonApiDungeonListSchema.Type;

import * as E from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { FELLOWSHIP_DUNGEON } from "@/catalogs/fellowship-dungeons-catalog.ts";

export const seedDungeonTable = E.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  for (const dungeon of Object.values(FELLOWSHIP_DUNGEON)) {
    yield* sql`
      INSERT INTO dungeon (
        id,
        map_id,
        name
      )
      VALUES (
        ${dungeon.dungeonId},
        ${dungeon.mapId},
        ${dungeon.name}
      )
    `;
  }
});

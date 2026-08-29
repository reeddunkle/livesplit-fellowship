import * as E from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { loadFellowshipUnitCatalog } from "@/catalogs/units/load-fellowship-unit-catalog.ts";

export const seedUnitTable = E.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const catalog = yield* loadFellowshipUnitCatalog();

  for (const unit of catalog) {
    yield* sql`
      INSERT INTO unit (
        id,
        group_key,
        name,
        status,
        variant
      )
      VALUES (
        ${unit.id},
        ${unit.groupKey},
        ${unit.name},
        ${unit.status},
        ${unit.variant}
      )
    `;

    for (const dungeonId of unit.dungeonIds) {
      yield* sql`
        INSERT INTO dungeon_unit (
          dungeon_id,
          unit_id
        )
        VALUES (
          ${dungeonId},
          ${unit.id}
        )
      `;
    }
  }
});

import * as E from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { ABILITIES_CATALOG } from "@/catalogs/fellowship-abilities-catalog.ts";

export const seedAbilityTable = E.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  for (const ability of Object.values(ABILITIES_CATALOG)) {
    yield* sql`
      INSERT INTO ability (
        id,
        name
      )
      VALUES (
        ${ability.id},
        ${ability.name}
      )
    `;

    if ("unitId" in ability) {
      yield* sql`
        INSERT INTO ability_unit (
          ability_id,
          unit_id
        )
        VALUES (
          ${ability.id},
          ${ability.unitId}
        )
      `;
    }
  }
});

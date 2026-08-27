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
  }
});

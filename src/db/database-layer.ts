import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as EString from "effect/String";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { migrateDatabase } from "@/db/migrate-database.ts";

function configureDatabase() {
  return E.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    yield* sql`PRAGMA foreign_keys = ON`;
  });
}

export function makeDatabaseLayer(filename: string) {
  const SqliteLive = SqliteClient.layer({
    filename,
    transformQueryNames: EString.camelToSnake,
    transformResultNames: EString.snakeToCamel,
  });

  const ConfiguredSqliteLive = Layer.effectDiscard(configureDatabase()).pipe(
    Layer.provideMerge(SqliteLive),
  );

  return Layer.effectDiscard(migrateDatabase).pipe(
    Layer.provideMerge(ConfiguredSqliteLive),
  );
}

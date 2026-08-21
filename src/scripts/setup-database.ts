import * as E from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { makeDatabaseLayer } from "@/db/database-layer.ts";

const databaseFilename =
  process.env.DATABASE_FILENAME ?? "./data/livesplit-fellowship.db";

const DatabaseLive = makeDatabaseLayer(databaseFilename);

const program = E.gen(function* () {
  yield* SqlClient.SqlClient;

  yield* E.logInfo("Database is ready.", {
    databaseFilename,
  });
}).pipe(E.provide(DatabaseLive));

E.runPromise(program).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

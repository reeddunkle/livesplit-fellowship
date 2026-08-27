import { NodeFileSystem } from "@effect/platform-node";
import * as E from "effect/Effect";
import * as Migrator from "effect/unstable/sql/Migrator";
import type * as SqlClient from "effect/unstable/sql/SqlClient";
import { type SqlError } from "effect/unstable/sql/SqlError";

import { createTables } from "@/db/migrations/0001-create-tables.ts";
import { seedTables } from "@/db/migrations/0002-seed-tables.ts";

const seedTablesWithDependencies = seedTables.pipe(
  E.provide(NodeFileSystem.layer),
);

const migrationLoader = Migrator.fromRecord({
  "1_create_tables": createTables,
  "2_seed_tables": seedTablesWithDependencies,
});

export const migrateDatabase: E.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  Migrator.MigrationError | SqlError,
  SqlClient.SqlClient
> = Migrator.make({})({
  loader: migrationLoader,
});

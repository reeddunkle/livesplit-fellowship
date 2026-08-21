import * as Migrator from "effect/unstable/sql/Migrator";

import { createConfigurationTables } from "@/db/migrations/0001-create-configuration-tables.ts";

const migrationLoader = Migrator.fromRecord({
  "1_create_configuration_tables": createConfigurationTables,
});

export const migrateDatabase = Migrator.make({})({
  loader: migrationLoader,
});

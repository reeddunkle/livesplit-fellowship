import * as E from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export const createTables = E.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE dungeon (
      id TEXT PRIMARY KEY NOT NULL,
      map_id TEXT NOT NULL,
      name TEXT NOT NULL
    ) STRICT
  `;

  yield* sql`
    CREATE TABLE unit (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL
    ) STRICT
  `;

  yield* sql`
    CREATE TABLE dungeon_unit (
      dungeon_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,

      PRIMARY KEY (
        dungeon_id,
        unit_id
      ),

      FOREIGN KEY (dungeon_id)
        REFERENCES dungeon(id),

      FOREIGN KEY (unit_id)
        REFERENCES unit(id)
    ) STRICT
  `;

  yield* sql`
    CREATE INDEX dungeon_unit_unit_id_index
      ON dungeon_unit(unit_id)
  `;

  yield* sql`
    CREATE TABLE ability (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL
    ) STRICT
  `;

  yield* sql`
    CREATE TABLE ability_unit (
      ability_id TEXT PRIMARY KEY NOT NULL,
      unit_id TEXT NOT NULL,

      FOREIGN KEY (ability_id)
        REFERENCES ability(id),

      FOREIGN KEY (unit_id)
        REFERENCES unit(id)
    ) STRICT
  `;

  yield* sql`
    CREATE INDEX ability_unit_unit_id_index
      ON ability_unit(unit_id)
  `;

  yield* sql`
    CREATE TABLE encounter (
      dungeon_id TEXT NOT NULL,
      id TEXT NOT NULL,
      name TEXT NOT NULL,

      PRIMARY KEY (
        dungeon_id,
        id
      ),

      FOREIGN KEY (dungeon_id)
        REFERENCES dungeon(id)
    ) STRICT
  `;

  yield* sql`
    CREATE INDEX encounter_dungeon_id_index
      ON encounter(dungeon_id)
  `;

  yield* sql`
    CREATE TABLE configuration (
      id TEXT PRIMARY KEY NOT NULL,
      dungeon_id TEXT NOT NULL,
      dungeon_level INTEGER NOT NULL
        CHECK (dungeon_level >= 1),
      label TEXT NOT NULL,
      fingerprint TEXT NOT NULL UNIQUE,
      canonical_json TEXT NOT NULL,
      created_at_milliseconds INTEGER NOT NULL,

      FOREIGN KEY (dungeon_id)
        REFERENCES dungeon(id)
    ) STRICT
  `;

  yield* sql`
    CREATE INDEX configuration_dungeon_id_index
      ON configuration(dungeon_id)
  `;

  yield* sql`
    CREATE TABLE milestone (
      id TEXT PRIMARY KEY NOT NULL,
      configuration_id TEXT NOT NULL,
      label TEXT NOT NULL,

      FOREIGN KEY (configuration_id)
        REFERENCES configuration(id)
        ON DELETE CASCADE
    ) STRICT
  `;

  yield* sql`
    CREATE INDEX milestone_configuration_id_index
      ON milestone(configuration_id)
  `;

  yield* sql`
    CREATE TABLE requirement (
      id TEXT PRIMARY KEY NOT NULL,
      milestone_id TEXT NOT NULL,
      type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      start_occurrence INTEGER NOT NULL
        CHECK (start_occurrence >= 1),
      required_count INTEGER NOT NULL
        CHECK (required_count >= 1),

      FOREIGN KEY (milestone_id)
        REFERENCES milestone(id)
        ON DELETE CASCADE,

      UNIQUE (
        milestone_id,
        type,
        target_id,
        start_occurrence,
        required_count
      )
    ) STRICT
  `;

  yield* sql`
    CREATE INDEX requirement_milestone_id_index
      ON requirement(milestone_id)
  `;
});

import * as E from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export const createConfigurationTables = E.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE configurations (
      id TEXT PRIMARY KEY NOT NULL,
      dungeon_key TEXT NOT NULL,
      fingerprint TEXT NOT NULL UNIQUE,
      canonical_json TEXT NOT NULL,
      created_at_milliseconds INTEGER NOT NULL
    ) STRICT
  `;

  yield* sql`
    CREATE TABLE milestones (
      id TEXT PRIMARY KEY NOT NULL,
      configuration_id TEXT NOT NULL,
      label TEXT NOT NULL,

      FOREIGN KEY (configuration_id)
        REFERENCES configurations(id)
        ON DELETE CASCADE
    ) STRICT
  `;

  yield* sql`
    CREATE INDEX milestones_configuration_id_index
      ON milestones(configuration_id)
  `;

  yield* sql`
    CREATE TABLE requirements (
      id TEXT PRIMARY KEY NOT NULL,
      milestone_id TEXT NOT NULL,
      type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      start_occurrence INTEGER NOT NULL
        CHECK (start_occurrence >= 1),
      required_count INTEGER NOT NULL
        CHECK (required_count >= 1),

      FOREIGN KEY (milestone_id)
        REFERENCES milestones(id)
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
    CREATE INDEX requirements_milestone_id_index
      ON requirements(milestone_id)
  `;
});

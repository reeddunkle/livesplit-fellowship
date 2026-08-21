import * as E from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { describe, expect, test } from "vitest";

import { makeDatabaseLayer } from "@/db/database-layer.ts";
import { runTest } from "@/tests/common/run-test.ts";

describe("DatabaseLayer", () => {
  test("runs database migrations", async () => {
    const program = E.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      const tables = yield* sql<{ readonly name: string }>`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN (
            'configurations',
            'milestones',
            'requirements'
          )
        ORDER BY name
      `;

      expect(tables).toEqual([
        {
          name: "configurations",
        },
        {
          name: "milestones",
        },
        {
          name: "requirements",
        },
      ]);
    }).pipe(E.provide(makeDatabaseLayer(":memory:")));

    await runTest(program);
  });

  test("cascades configuration deletion to milestones and requirements", async () => {
    const program = E.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      yield* sql`
        INSERT INTO configurations (
          id,
          dungeon_key,
          fingerprint,
          canonical_json,
          created_at_milliseconds
        )
        VALUES (
          'configuration-1',
          'EVERDAWN_GROVE',
          'fingerprint-1',
          '{}',
          1000
        )
      `;

      yield* sql`
        INSERT INTO milestones (
          id,
          configuration_id,
          label
        )
        VALUES (
          'milestone-1',
          'configuration-1',
          'Desecrator 1 Killed'
        )
      `;

      yield* sql`
        INSERT INTO requirements (
          id,
          milestone_id,
          type,
          target_id,
          start_occurrence,
          required_count
        )
        VALUES (
          'requirement-1',
          'milestone-1',
          'UNIT_DEATH',
          '42',
          1,
          1
        )
      `;

      yield* sql`
        DELETE FROM configurations
        WHERE id = 'configuration-1'
      `;

      const configurations = yield* sql`
        SELECT id
        FROM configurations
      `;

      const milestones = yield* sql`
        SELECT id
        FROM milestones
      `;

      const requirements = yield* sql`
        SELECT id
        FROM requirements
      `;

      expect(configurations).toEqual([]);
      expect(milestones).toEqual([]);
      expect(requirements).toEqual([]);
    }).pipe(E.provide(makeDatabaseLayer(":memory:")));

    await runTest(program);
  });
});

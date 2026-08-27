import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
            'ability',
            'configuration',
            'dungeon',
            'dungeon_unit',
            'encounter',
            'milestone',
            'requirement',
            'unit'
          )
        ORDER BY name
      `;

      expect(tables).toEqual([
        {
          name: "ability",
        },
        {
          name: "configuration",
        },
        {
          name: "dungeon",
        },
        {
          name: "dungeon_unit",
        },
        {
          name: "encounter",
        },
        {
          name: "milestone",
        },
        {
          name: "requirement",
        },
        {
          name: "unit",
        },
      ]);
    }).pipe(E.provide(makeDatabaseLayer(":memory:")));

    await runTest(program);
  });

  test("seeds catalog tables", async () => {
    const program = E.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      const dungeons = yield* sql<{
        readonly id: string;
        readonly mapId: string;
        readonly name: string;
      }>`
        SELECT
          id,
          map_id,
          name
        FROM dungeon
        WHERE id = '11'
      `;

      const abilities = yield* sql<{
        readonly id: string;
        readonly name: string;
      }>`
        SELECT
          id,
          name
        FROM ability
        WHERE id = '634'
      `;

      const encounters = yield* sql<{
        readonly dungeonId: string;
        readonly id: string;
        readonly name: string;
      }>`
        SELECT
          dungeon_id,
          id,
          name
        FROM encounter
        WHERE dungeon_id = '24'
          AND id = '33'
      `;

      const unitCount = yield* sql<{
        readonly count: number;
      }>`
        SELECT COUNT(*) AS count
        FROM unit
      `;

      const dungeonUnitCount = yield* sql<{
        readonly count: number;
      }>`
        SELECT COUNT(*) AS count
        FROM dungeon_unit
      `;

      expect(dungeons).toEqual([
        {
          id: "11",
          mapId: "26",
          name: "Everdawn Grove",
        },
      ]);

      expect(abilities).toEqual([
        {
          id: "634",
          name: "Stormy Retreat",
        },
      ]);

      expect(encounters).toEqual([
        {
          dungeonId: "24",
          id: "33",
          name: "Vexira",
        },
      ]);

      expect(unitCount[0]?.count).toBeGreaterThan(0);
      expect(dungeonUnitCount[0]?.count).toBeGreaterThan(0);
    }).pipe(E.provide(makeDatabaseLayer(":memory:")));

    await runTest(program);
  });

  test("cascades configuration deletion to milestones and requirements", async () => {
    const program = E.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      yield* sql`
        INSERT INTO configuration (
          id,
          dungeon_id,
          dungeon_level,
          fingerprint,
          canonical_json,
          created_at_milliseconds
        )
        VALUES (
          'configuration-1',
          '11',
          63,
          'fingerprint-1',
          '{}',
          1000
        )
      `;

      yield* sql`
        INSERT INTO milestone (
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
        INSERT INTO requirement (
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
        DELETE FROM configuration
        WHERE id = 'configuration-1'
      `;

      const configurations = yield* sql`
        SELECT id
        FROM configuration
      `;

      const milestones = yield* sql`
        SELECT id
        FROM milestone
      `;

      const requirements = yield* sql`
        SELECT id
        FROM requirement
      `;

      expect(configurations).toEqual([]);
      expect(milestones).toEqual([]);
      expect(requirements).toEqual([]);
    }).pipe(E.provide(makeDatabaseLayer(":memory:")));

    await runTest(program);
  });

  test("creates the database parent directory on first startup", async () => {
    const directory = await mkdtemp(join(tmpdir(), "livesplit-fellowship-"));

    const databaseFilename = join(
      directory,
      "nested",
      "data",
      "livesplit-fellowship.db",
    );

    const program = E.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      const result = yield* sql`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
      `;

      expect(result.length).toBeGreaterThan(0);
    }).pipe(E.provide(makeDatabaseLayer(databaseFilename)));

    try {
      await runTest(program);
    } finally {
      await rm(directory, {
        force: true,
        recursive: true,
      });
    }
  });
});

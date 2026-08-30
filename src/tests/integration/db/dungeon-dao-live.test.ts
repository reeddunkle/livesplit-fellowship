import * as DateTime from "effect/DateTime";
import * as E from "effect/Effect";
import * as Option from "effect/Option";
import { describe, expect, test } from "vitest";

import { DungeonDAO } from "@/db/daos/dungeon/dungeon-dao.ts";
import { makePersistenceLayer } from "@/layers/persistence-layer.ts";
import { runTest } from "@/tests/common/run-test.ts";

const CITHRELS_FALL_DUNGEON_ID = "7";
const EVERDAWN_GROVE_DUNGEON_ID = "11";

function makeTestLayer() {
  return makePersistenceLayer({
    databaseFilename: ":memory:",
  });
}

describe("DungeonDAOLive", () => {
  test("returns all seeded dungeons", async () => {
    const program = E.gen(function* () {
      const dungeonDAO = yield* DungeonDAO;

      const dungeons = yield* dungeonDAO.getAll();

      expect(dungeons.length).toBeGreaterThan(0);

      expect(dungeons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: CITHRELS_FALL_DUNGEON_ID,
            mapId: "1",
            name: "Cithrel's Fall",
          }),
          expect.objectContaining({
            id: EVERDAWN_GROVE_DUNGEON_ID,
            mapId: "26",
            name: "Everdawn Grove",
          }),
        ]),
      );
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("returns a dungeon by id", async () => {
    const program = E.gen(function* () {
      const dungeonDAO = yield* DungeonDAO;

      const result = yield* dungeonDAO.getById({
        id: EVERDAWN_GROVE_DUNGEON_ID,
      });

      expect(Option.isSome(result)).toBe(true);

      if (Option.isSome(result)) {
        expect(result.value).toMatchObject({
          id: EVERDAWN_GROVE_DUNGEON_ID,
          mapId: "26",
          name: "Everdawn Grove",
        });

        expect(DateTime.isUtc(result.value.createdAt)).toBe(true);
        expect(DateTime.isUtc(result.value.updatedAt)).toBe(true);
      }
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });

  test("returns none for an unknown dungeon id", async () => {
    const program = E.gen(function* () {
      const dungeonDAO = yield* DungeonDAO;

      const result = yield* dungeonDAO.getById({
        id: "999999",
      });

      expect(Option.isNone(result)).toBe(true);
    }).pipe(E.provide(makeTestLayer()));

    await runTest(program);
  });
});

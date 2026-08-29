import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { UnitModel } from "@/db/models/unit-model.ts";
import { NonEmptyStringSchema } from "@/validation/common.ts";

import { UnitDAO, type UnitDAOShape } from "./unit-dao.ts";

const UnitRowSchema = Schema.Struct({
  dungeonId: Schema.NullOr(NonEmptyStringSchema),
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
});

type UnitRow = typeof UnitRowSchema.Type;

function decodeUnitRows(
  rows: unknown,
): E.Effect<ReadonlyArray<UnitRow>, Schema.SchemaError> {
  return Schema.decodeUnknownEffect(Schema.Array(UnitRowSchema))(rows);
}

function createUnitModels(
  rows: ReadonlyArray<UnitRow>,
): ReadonlyArray<UnitModel> {
  const unitsById = new Map<
    string,
    {
      dungeonIds: Array<string>;
      id: string;
      name: string;
    }
  >();

  for (const row of rows) {
    const existingUnit = unitsById.get(row.id);

    if (existingUnit !== undefined) {
      if (row.dungeonId !== null) {
        existingUnit.dungeonIds.push(row.dungeonId);
      }

      continue;
    }

    unitsById.set(row.id, {
      dungeonIds: row.dungeonId === null ? [] : [row.dungeonId],
      id: row.id,
      name: row.name,
    });
  }

  return Array.from(unitsById.values()).map((unit) => {
    return new UnitModel(unit);
  });
}

const make = E.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const getAll: UnitDAOShape["getAll"] = () => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          unit.id,
          unit.name,
          dungeon_unit.dungeon_id AS dungeonId
        FROM unit
        LEFT JOIN dungeon_unit
          ON dungeon_unit.unit_id = unit.id
        ORDER BY unit.name
      `;

      const unitRows = yield* decodeUnitRows(rows);

      return createUnitModels(unitRows);
    });
  };

  const getById: UnitDAOShape["getById"] = ({ id }) => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          unit.id,
          unit.name,
          dungeon_unit.dungeon_id AS dungeonId
        FROM unit
        LEFT JOIN dungeon_unit
          ON dungeon_unit.unit_id = unit.id
        WHERE unit.id = ${id}
      `;

      const unitRows = yield* decodeUnitRows(rows);
      const unit = createUnitModels(unitRows)[0];

      return unit === undefined ? Option.none<UnitModel>() : Option.some(unit);
    });
  };

  return {
    getAll,
    getById,
  } satisfies UnitDAOShape;
});

export const UnitDAOLive = Layer.effect(UnitDAO, make);

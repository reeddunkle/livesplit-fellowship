import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { UnitModel } from "@/db/models/unit-model.ts";

import { UnitDAO, type UnitDAOShape } from "./unit-dao.ts";

function decodeUnitRows(
  rows: unknown,
): E.Effect<ReadonlyArray<UnitModel>, Schema.SchemaError> {
  return Schema.decodeUnknownEffect(Schema.Array(UnitModel))(rows);
}

const make = E.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const getAll: UnitDAOShape["getAll"] = () => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          id,
          name
        FROM unit
        ORDER BY name
      `;

      return yield* decodeUnitRows(rows);
    });
  };

  const getById: UnitDAOShape["getById"] = ({ id }) => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          id,
          name
        FROM unit
        WHERE id = ${id}
        LIMIT 1
      `;

      const units = yield* decodeUnitRows(rows);
      const unit = units[0];

      return unit === undefined ? Option.none<UnitModel>() : Option.some(unit);
    });
  };

  return {
    getAll,
    getById,
  } satisfies UnitDAOShape;
});

export const UnitDAOLive = Layer.effect(UnitDAO, make);

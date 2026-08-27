import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { EncounterModel } from "@/db/models/encounter-model.ts";

import { EncounterDAO, type EncounterDAOShape } from "./encounter-dao.ts";

function decodeEncounterRows(
  rows: unknown,
): E.Effect<ReadonlyArray<EncounterModel>, Schema.SchemaError> {
  return Schema.decodeUnknownEffect(Schema.Array(EncounterModel))(rows);
}

const make = E.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const getAll: EncounterDAOShape["getAll"] = () => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          dungeon_id,
          id,
          name
        FROM encounter
        ORDER BY name
      `;

      return yield* decodeEncounterRows(rows);
    });
  };

  const getById: EncounterDAOShape["getById"] = ({ dungeonId, id }) => {
    return E.gen(function* () {
      const rows = yield* sql`
        SELECT
          dungeon_id,
          id,
          name
        FROM encounter
        WHERE dungeon_id = ${dungeonId}
          AND id = ${id}
        LIMIT 1
      `;

      const encounters = yield* decodeEncounterRows(rows);
      const encounter = encounters[0];

      return encounter === undefined
        ? Option.none<EncounterModel>()
        : Option.some(encounter);
    });
  };

  return {
    getAll,
    getById,
  } satisfies EncounterDAOShape;
});

export const EncounterDAOLive = Layer.effect(EncounterDAO, make);

import * as Context from "effect/Context";
import type * as E from "effect/Effect";
import type * as Option from "effect/Option";
import type * as Schema from "effect/Schema";
import type * as SqlError from "effect/unstable/sql/SqlError";

import { type AbilityModel } from "@/db/models/ability-model.ts";

type GetAbilityByIdOptions = {
  readonly id: string;
};

export type AbilityDAOError = SqlError.SqlError | Schema.SchemaError;

export interface AbilityDAOShape {
  readonly getAll: () => E.Effect<ReadonlyArray<AbilityModel>, AbilityDAOError>;

  readonly getById: (
    options: GetAbilityByIdOptions,
  ) => E.Effect<Option.Option<AbilityModel>, AbilityDAOError>;
}

export class AbilityDAO extends Context.Service<AbilityDAO, AbilityDAOShape>()(
  "app/AbilityDAO",
) {}

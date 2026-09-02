import * as Context from "effect/Context";
import type * as E from "effect/Effect";
import type * as Option from "effect/Option";

import {
  type DungeonRunId,
  type DungeonRunModel,
} from "@/db/models/dungeon-run-model.ts";
import { type DungeonRunDAOError } from "@/errors/dungeon-run-dao-error.ts";
import { type ConfigurationDefinitionId } from "@/validation/configuration/configuration-definition-id-schema.ts";

type GetDungeonRunByIdOptions = {
  readonly id: DungeonRunId;
};

type StartDungeonRunOptions = {
  readonly configurationDefinitionId: ConfigurationDefinitionId;
  readonly dungeonId: DungeonRunModel["dungeonId"];
  readonly dungeonLevel: DungeonRunModel["dungeonLevel"];
  readonly startedAt: DungeonRunModel["startedAt"];
};

type CompleteDungeonRunOptions = {
  readonly dungeonRunId: DungeonRunId;
  readonly endedAt: NonNullable<DungeonRunModel["endedAt"]>;
};

type ExitDungeonRunOptions = {
  readonly dungeonRunId: DungeonRunId;
  readonly endedAt: NonNullable<DungeonRunModel["endedAt"]>;
};

type InterruptDungeonRunOptions = {
  readonly dungeonRunId: DungeonRunId;
  readonly endedAt: NonNullable<DungeonRunModel["endedAt"]>;
};

export type DungeonRunDAOShape = {
  readonly complete: (
    options: CompleteDungeonRunOptions,
  ) => E.Effect<void, DungeonRunDAOError>;

  readonly exit: (
    options: ExitDungeonRunOptions,
  ) => E.Effect<void, DungeonRunDAOError>;

  readonly getById: (
    options: GetDungeonRunByIdOptions,
  ) => E.Effect<Option.Option<DungeonRunModel>, DungeonRunDAOError>;

  readonly interrupt: (
    options: InterruptDungeonRunOptions,
  ) => E.Effect<void, DungeonRunDAOError>;

  readonly start: (
    options: StartDungeonRunOptions,
  ) => E.Effect<DungeonRunModel, DungeonRunDAOError>;
};

export class DungeonRunDAO extends Context.Service<
  DungeonRunDAO,
  DungeonRunDAOShape
>()("app/DungeonRunDAO") {}

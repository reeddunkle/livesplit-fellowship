import * as Context from "effect/Context";
import type * as E from "effect/Effect";
import type * as Option from "effect/Option";

import {
  type DungeonRunId,
  type DungeonRunModel,
} from "@/db/models/dungeon-run-model.ts";
import { type DungeonRunObservationModel } from "@/db/models/dungeon-run-observation-model.ts";
import { type DungeonRunDAOError } from "@/errors/dungeon-run-dao-error.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id-schema.ts";

type GetDungeonRunByIdOptions = {
  readonly id: DungeonRunId;
};

type StartDungeonRunOptions = {
  readonly configurationId: ConfigurationId | null;
  readonly dungeonId: DungeonRunModel["dungeonId"];
  readonly dungeonLevel: DungeonRunModel["dungeonLevel"];
  readonly startedAt: DungeonRunModel["startedAt"];
};

type ObserveDungeonRunOptions = {
  readonly dungeonRunId: DungeonRunId;
  readonly observedAt: DungeonRunObservationModel["observedAt"];
  readonly occurrence: DungeonRunObservationModel["occurrence"];
  readonly targetId: DungeonRunObservationModel["targetId"];
  readonly type: DungeonRunObservationModel["type"];
};

type CompleteDungeonRunOptions = {
  readonly dungeonRunId: DungeonRunId;
  readonly endedAt: NonNullable<DungeonRunModel["endedAt"]>;
};

type ExitDungeonRunOptions = {
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

  readonly observe: (
    options: ObserveDungeonRunOptions,
  ) => E.Effect<void, DungeonRunDAOError>;

  readonly start: (
    options: StartDungeonRunOptions,
  ) => E.Effect<DungeonRunModel, DungeonRunDAOError>;
};

export class DungeonRunDAO extends Context.Service<
  DungeonRunDAO,
  DungeonRunDAOShape
>()("app/DungeonRunDAO") {}

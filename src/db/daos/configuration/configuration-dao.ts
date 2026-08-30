import * as Context from "effect/Context";
import type * as E from "effect/Effect";
import type * as Option from "effect/Option";

import { type ConfigurationModel } from "@/db/models/configuration-model.ts";
import { type ConfigurationDAOError } from "@/errors/configuration-dao-error.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type ConfigurationFingerprint } from "@/validation/configuration/configuration-fingerprint.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";
import { type ConfigurationLabel } from "@/validation/configuration/configuration-label.ts";

export type PersistedConfiguration = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly createdAt: ConfigurationModel["createdAt"];
  readonly fingerprint: ConfigurationFingerprint;
  readonly id: ConfigurationId;
  readonly label: ConfigurationLabel;
  readonly updatedAt: ConfigurationModel["updatedAt"];
};

type SaveConfigurationOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly label: ConfigurationLabel;
};

type UpdateConfigurationOptions = SaveConfigurationOptions & {
  readonly id: ConfigurationId;
};

type GetConfigurationByIdOptions = {
  readonly id: ConfigurationId;
};

type DeleteConfigurationOptions = {
  readonly id: ConfigurationId;
};

type DeleteConfigurationsByDungeonAndLevelOptions = {
  readonly dungeonId: FellowshipMilestoneConfiguration["dungeonId"];
  readonly dungeonLevel: FellowshipMilestoneConfiguration["dungeonLevel"];
};

export type ConfigurationDAOShape = {
  readonly delete: (
    options: DeleteConfigurationOptions,
  ) => E.Effect<void, ConfigurationDAOError>;

  readonly deleteByDungeonAndLevel: (
    options: DeleteConfigurationsByDungeonAndLevelOptions,
  ) => E.Effect<void, ConfigurationDAOError>;

  readonly getAll: () => E.Effect<
    ReadonlyArray<PersistedConfiguration>,
    ConfigurationDAOError
  >;

  readonly getById: (
    options: GetConfigurationByIdOptions,
  ) => E.Effect<Option.Option<PersistedConfiguration>, ConfigurationDAOError>;

  readonly save: (
    options: SaveConfigurationOptions,
  ) => E.Effect<PersistedConfiguration, ConfigurationDAOError>;

  readonly saveReplacingDungeonAndLevel: (
    options: SaveConfigurationOptions,
  ) => E.Effect<PersistedConfiguration, ConfigurationDAOError>;

  readonly update: (
    options: UpdateConfigurationOptions,
  ) => E.Effect<PersistedConfiguration, ConfigurationDAOError>;
};

export class ConfigurationDAO extends Context.Service<
  ConfigurationDAO,
  ConfigurationDAOShape
>()("app/ConfigurationDAO") {}

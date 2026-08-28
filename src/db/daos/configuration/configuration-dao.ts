import * as Context from "effect/Context";
import type * as E from "effect/Effect";
import type * as Option from "effect/Option";

import { type ConfigurationDAOError } from "@/errors/configuration-dao-error.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";
import { type ConfigurationLabel } from "@/validation/configuration/configuration-label.ts";

export type PersistedConfiguration = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly id: ConfigurationId;
  readonly label: ConfigurationLabel;
};

type SaveConfigurationOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly label: ConfigurationLabel;
};

type GetConfigurationByIdOptions = {
  readonly id: ConfigurationId;
};

type DeleteConfigurationOptions = {
  readonly id: ConfigurationId;
};

export type ConfigurationDAOShape = {
  readonly delete: (
    options: DeleteConfigurationOptions,
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
};

export class ConfigurationDAO extends Context.Service<
  ConfigurationDAO,
  ConfigurationDAOShape
>()("app/ConfigurationDAO") {}

import * as Context from "effect/Context";
import type * as E from "effect/Effect";
import type * as Option from "effect/Option";

import { type ConfigurationDAOError } from "@/errors/configuration-dao-error.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

export type PersistedConfiguration = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly id: ConfigurationId;
};

type CreateConfigurationOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
};

type GetConfigurationByIdOptions = {
  readonly id: ConfigurationId;
};

type DeleteConfigurationOptions = {
  readonly id: ConfigurationId;
};

export type ConfigurationDAOShape = {
  readonly create: (
    options: CreateConfigurationOptions,
  ) => E.Effect<PersistedConfiguration, ConfigurationDAOError>;

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
};

export class ConfigurationDAO extends Context.Service<
  ConfigurationDAO,
  ConfigurationDAOShape
>()("app/ConfigurationDAO") {}

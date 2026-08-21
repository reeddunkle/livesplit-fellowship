import * as Context from "effect/Context";
import type * as E from "effect/Effect";
import type * as Option from "effect/Option";

import { type ConfigurationRepositoryError } from "@/errors/configuration-repository-error.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

export type ConfigurationId = string;

export type PersistedConfiguration = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly id: ConfigurationId;
};

export type CreateConfigurationOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
};

export type GetConfigurationByIdOptions = {
  readonly id: ConfigurationId;
};

export type DeleteConfigurationOptions = {
  readonly id: ConfigurationId;
};

export type ConfigurationRepositoryShape = {
  readonly create: (
    options: CreateConfigurationOptions,
  ) => E.Effect<PersistedConfiguration, ConfigurationRepositoryError>;

  readonly delete: (
    options: DeleteConfigurationOptions,
  ) => E.Effect<void, ConfigurationRepositoryError>;

  readonly getAll: () => E.Effect<
    ReadonlyArray<PersistedConfiguration>,
    ConfigurationRepositoryError
  >;

  readonly getById: (
    options: GetConfigurationByIdOptions,
  ) => E.Effect<
    Option.Option<PersistedConfiguration>,
    ConfigurationRepositoryError
  >;
};

export class ConfigurationRepository extends Context.Service<
  ConfigurationRepository,
  ConfigurationRepositoryShape
>()("app/ConfigurationRepository") {}

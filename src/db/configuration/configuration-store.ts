import * as Context from "effect/Context";
import type * as E from "effect/Effect";
import type * as Option from "effect/Option";

import { type ConfigurationStoreError } from "@/errors/configuration-store-error.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

export type ConfigurationId = string;

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

export type ConfigurationStoreShape = {
  readonly create: (
    options: CreateConfigurationOptions,
  ) => E.Effect<PersistedConfiguration, ConfigurationStoreError>;

  readonly delete: (
    options: DeleteConfigurationOptions,
  ) => E.Effect<void, ConfigurationStoreError>;

  readonly getAll: () => E.Effect<
    ReadonlyArray<PersistedConfiguration>,
    ConfigurationStoreError
  >;

  readonly getById: (
    options: GetConfigurationByIdOptions,
  ) => E.Effect<Option.Option<PersistedConfiguration>, ConfigurationStoreError>;
};

export class ConfigurationStore extends Context.Service<
  ConfigurationStore,
  ConfigurationStoreShape
>()("app/ConfigurationStore") {}

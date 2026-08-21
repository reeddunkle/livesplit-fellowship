import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import {
  type ConfigurationId,
  ConfigurationStore,
} from "@/db/configuration/configuration-store.ts";
import { type ConfigurationStoreError } from "@/errors/configuration-store-error.ts";
import {
  type ConfigurationApiConfiguration,
  type ConfigurationApiConfigurationList,
} from "@/services/api/configuration/configuration-api-schema.ts";
import { createConfigurationApiResponse } from "@/services/api/configuration/create-configuration-api-response.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";

export type CreateConfigurationApiOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
};

export type DeleteConfigurationApiOptions = {
  readonly id: ConfigurationId;
};

export type GetConfigurationApiByIdOptions = {
  readonly id: ConfigurationId;
};

export type ConfigurationApiServiceShape = {
  readonly create: (
    options: CreateConfigurationApiOptions,
  ) => E.Effect<ConfigurationApiConfiguration, ConfigurationStoreError>;

  readonly delete: (
    options: DeleteConfigurationApiOptions,
  ) => E.Effect<void, ConfigurationStoreError>;

  readonly getAll: () => E.Effect<
    ConfigurationApiConfigurationList,
    ConfigurationStoreError
  >;

  readonly getById: (
    options: GetConfigurationApiByIdOptions,
  ) => E.Effect<
    Option.Option<ConfigurationApiConfiguration>,
    ConfigurationStoreError
  >;
};

export class ConfigurationApiService extends Context.Service<
  ConfigurationApiService,
  ConfigurationApiServiceShape
>()("app/ConfigurationApiService") {}

const make = E.gen(function* () {
  const configurationStore = yield* ConfigurationStore;

  const create: ConfigurationApiServiceShape["create"] = ({
    configuration,
  }) => {
    return configurationStore.create({ configuration }).pipe(
      E.map((persistedConfiguration) => {
        return createConfigurationApiResponse(persistedConfiguration);
      }),
    );
  };

  const deleteConfiguration: ConfigurationApiServiceShape["delete"] = ({
    id,
  }) => {
    return configurationStore.delete({ id });
  };

  const getAll: ConfigurationApiServiceShape["getAll"] = () => {
    return configurationStore.getAll().pipe(
      E.map((configurations) => {
        return configurations.map(createConfigurationApiResponse);
      }),
    );
  };

  const getById: ConfigurationApiServiceShape["getById"] = ({ id }) => {
    return configurationStore.getById({ id }).pipe(
      E.map(
        Option.map((configuration) => {
          return createConfigurationApiResponse(configuration);
        }),
      ),
    );
  };

  return {
    create,
    delete: deleteConfiguration,
    getAll,
    getById,
  } satisfies ConfigurationApiServiceShape;
});

export const ConfigurationApiServiceLive = Layer.effect(
  ConfigurationApiService,
  make,
);

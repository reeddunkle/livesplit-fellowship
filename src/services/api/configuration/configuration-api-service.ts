import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { ConfigurationDAO } from "@/db/daos/configuration/configuration-dao.ts";
import { type ConfigurationDAOError } from "@/errors/configuration-dao-error.ts";
import {
  type ConfigurationApiConfiguration,
  type ConfigurationApiConfigurationList,
} from "@/services/api/configuration/configuration-api-schema.ts";
import { createConfigurationApiResponse } from "@/services/api/configuration/create-configuration-api-response.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

type CreateConfigurationOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
};

type DeleteConfigurationOptions = {
  readonly id: ConfigurationId;
};

type GetConfigurationByIdOptions = {
  readonly id: ConfigurationId;
};

export type ConfigurationApiServiceShape = {
  readonly create: (
    options: CreateConfigurationOptions,
  ) => E.Effect<ConfigurationApiConfiguration, ConfigurationDAOError>;

  readonly delete: (
    options: DeleteConfigurationOptions,
  ) => E.Effect<void, ConfigurationDAOError>;

  readonly getAll: () => E.Effect<
    ConfigurationApiConfigurationList,
    ConfigurationDAOError
  >;

  readonly getById: (
    options: GetConfigurationByIdOptions,
  ) => E.Effect<
    Option.Option<ConfigurationApiConfiguration>,
    ConfigurationDAOError
  >;
};

export class ConfigurationApiService extends Context.Service<
  ConfigurationApiService,
  ConfigurationApiServiceShape
>()("app/ConfigurationApiService") {}

const make = E.gen(function* () {
  const configurationStore = yield* ConfigurationDAO;

  const create: ConfigurationApiServiceShape["create"] = ({
    configuration,
  }) => {
    return configurationStore
      .create({ configuration })
      .pipe(E.map(createConfigurationApiResponse));
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
    return configurationStore
      .getById({ id })
      .pipe(E.map(Option.map(createConfigurationApiResponse)));
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

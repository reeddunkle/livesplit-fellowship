import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import {
  ConfigurationApiService,
  type ConfigurationApiServiceShape,
} from "@/services/api/configuration/configuration-api-service.ts";
import { createConfigurationApiResponse } from "@/services/api/configuration/create-configuration-api-response.ts";

const TEST_CONFIGURATION_ID = "00000000-0000-7000-8000-000000000000";

export type MakeConfigurationApiServiceTestOptions =
  Partial<ConfigurationApiServiceShape>;

export function makeConfigurationApiServiceTest({
  create = ({ configuration }) => {
    return E.succeed(
      createConfigurationApiResponse({
        configuration,
        id: TEST_CONFIGURATION_ID,
      }),
    );
  },
  delete: deleteConfiguration = () => {
    return E.void;
  },
  getAll = () => {
    return E.succeed([]);
  },
  getById = () => {
    return E.succeed(Option.none());
  },
}: MakeConfigurationApiServiceTestOptions = {}) {
  return Layer.succeed(ConfigurationApiService, {
    create,
    delete: deleteConfiguration,
    getAll,
    getById,
  } satisfies ConfigurationApiServiceShape);
}

export const ConfigurationApiServiceTest = makeConfigurationApiServiceTest();

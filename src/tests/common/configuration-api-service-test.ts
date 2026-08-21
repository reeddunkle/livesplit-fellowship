import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import {
  ConfigurationApiService,
  type ConfigurationApiServiceShape,
} from "@/services/api/configuration/configuration-api-service.ts";

export type MakeConfigurationApiServiceTestOptions =
  Partial<ConfigurationApiServiceShape>;

export function makeConfigurationApiServiceTest({
  getAll = () => {
    return E.succeed([]);
  },
  getById = () => {
    return E.succeed(Option.none());
  },
}: MakeConfigurationApiServiceTestOptions = {}) {
  return Layer.succeed(ConfigurationApiService, {
    getAll,
    getById,
  } satisfies ConfigurationApiServiceShape);
}

export const ConfigurationApiServiceTest = makeConfigurationApiServiceTest();

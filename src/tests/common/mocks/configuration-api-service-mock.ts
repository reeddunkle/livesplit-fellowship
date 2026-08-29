import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import {
  ConfigurationApiService,
  type ConfigurationApiServiceShape,
} from "@/services/api/configuration/configuration-api-service.ts";
import { createConfigurationApiResponse } from "@/services/api/configuration/create-configuration-api-response.ts";
import {
  TEST_CONFIGURATION_FINGERPRINT,
  TEST_CONFIGURATION_ID,
} from "@/tests/common/fixtures/configuration-fixtures.ts";

export type MakeConfigurationApiServiceMockOptions =
  Partial<ConfigurationApiServiceShape>;

export function makeConfigurationApiServiceMock({
  delete: deleteConfiguration = () => {
    return E.void;
  },
  getAll = () => {
    return E.succeed([]);
  },
  getById = () => {
    return E.succeed(Option.none());
  },
  save = ({ configuration, label }) => {
    return E.succeed(
      createConfigurationApiResponse({
        configuration,
        fingerprint: TEST_CONFIGURATION_FINGERPRINT,
        id: TEST_CONFIGURATION_ID,
        label,
      }),
    );
  },
}: MakeConfigurationApiServiceMockOptions = {}) {
  return Layer.succeed(ConfigurationApiService, {
    delete: deleteConfiguration,
    getAll,
    getById,
    save,
  } satisfies ConfigurationApiServiceShape);
}

export const ConfigurationApiServiceMock = makeConfigurationApiServiceMock();

import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import {
  ConfigurationApiService,
  type ConfigurationApiServiceShape,
} from "@/services/api/configuration/configuration-api-service.ts";
import { createConfigurationApiResponse } from "@/services/api/configuration/create-configuration-api-response.ts";
import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id.ts";

const TEST_CONFIGURATION_ID = Schema.decodeUnknownSync(ConfigurationIdSchema)(
  "00000000-0000-7000-8000-000000000000",
);

export type MakeConfigurationApiServiceMockOptions =
  Partial<ConfigurationApiServiceShape>;

export function makeConfigurationApiServiceMock({
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
}: MakeConfigurationApiServiceMockOptions = {}) {
  return Layer.succeed(ConfigurationApiService, {
    create,
    delete: deleteConfiguration,
    getAll,
    getById,
  } satisfies ConfigurationApiServiceShape);
}

export const ConfigurationApiServiceMock = makeConfigurationApiServiceMock();

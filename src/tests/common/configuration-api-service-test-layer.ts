import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import {
  ConfigurationApiService,
  type ConfigurationApiServiceShape,
} from "@/services/api/configuration/configuration-api-service.ts";

export const ConfigurationApiServiceTest = Layer.succeed(
  ConfigurationApiService,
  {
    getAll: () => {
      return E.succeed([]);
    },

    getById: () => {
      return E.succeed(Option.none());
    },
  } satisfies ConfigurationApiServiceShape,
);

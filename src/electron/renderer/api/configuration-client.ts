import * as E from "effect/Effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";

import { AppHttpApi } from "@/api/http/http-api.ts";
import { getApiBaseUrl } from "@/electron/renderer/api/api-url.ts";
import { type SaveConfigurationApiRequest } from "@/services/api/configuration/configuration-api-schema.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

type ConfigurationIdArgs = {
  readonly id: ConfigurationId;
};

export type SaveConfigurationArgs = {
  readonly request: SaveConfigurationApiRequest;
};

function makeHttpApiClient(baseUrl: string) {
  return HttpApiClient.make(AppHttpApi, {
    baseUrl,
  }).pipe(E.provide(FetchHttpClient.layer));
}

export function getConfigurationsBase(baseUrl: string) {
  return () => {
    return E.gen(function* () {
      const client = yield* makeHttpApiClient(baseUrl);

      return yield* client.configurations.getConfigurations();
    });
  };
}

export function getConfigurationBase(baseUrl: string) {
  return ({ id }: ConfigurationIdArgs) => {
    return E.gen(function* () {
      const client = yield* makeHttpApiClient(baseUrl);

      return yield* client.configurations.getConfiguration({
        params: {
          id,
        },
      });
    });
  };
}

export function saveConfigurationBase(baseUrl: string) {
  return ({ request }: SaveConfigurationArgs) => {
    return E.gen(function* () {
      const client = yield* makeHttpApiClient(baseUrl);

      return yield* client.configurations.saveConfiguration({
        payload: request,
      });
    });
  };
}

export function deleteConfigurationBase(baseUrl: string) {
  return ({ id }: ConfigurationIdArgs) => {
    return E.gen(function* () {
      const client = yield* makeHttpApiClient(baseUrl);

      yield* client.configurations.deleteConfiguration({
        params: {
          id,
        },
      });
    });
  };
}

export function getConfigurations() {
  return getConfigurationsBase(getApiBaseUrl())();
}

// function getConfiguration(args: ConfigurationIdArgs) {
//   return getConfigurationBase(getApiBaseUrl())(args);
// }

export function saveConfiguration(args: SaveConfigurationArgs) {
  return saveConfigurationBase(getApiBaseUrl())(args);
}

export function deleteConfiguration(args: ConfigurationIdArgs) {
  return deleteConfigurationBase(getApiBaseUrl())(args);
}

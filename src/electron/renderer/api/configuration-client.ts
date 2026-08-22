import * as E from "effect/Effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";

import { AppHttpApi } from "@/api/http/http-api.ts";
import { getApiBaseUrl } from "@/electron/renderer/api/api-url.ts";
import { type CreateConfigurationApiRequest } from "@/services/api/configuration/configuration-api-schema.ts";

function makeHttpApiClientForUrl(baseUrl: string) {
  return HttpApiClient.make(AppHttpApi, {
    baseUrl,
  }).pipe(E.provide(FetchHttpClient.layer));
}

export function getConfigurationsForUrl(baseUrl: string) {
  return E.gen(function* () {
    const client = yield* makeHttpApiClientForUrl(baseUrl);

    return yield* client.configurations.getConfigurations();
  });
}

export function getConfigurationForUrl(baseUrl: string, id: string) {
  return E.gen(function* () {
    const client = yield* makeHttpApiClientForUrl(baseUrl);

    return yield* client.configurations.getConfiguration({
      params: {
        id,
      },
    });
  });
}

export function createConfigurationForUrl(
  baseUrl: string,
  request: CreateConfigurationApiRequest,
) {
  return E.gen(function* () {
    const client = yield* makeHttpApiClientForUrl(baseUrl);

    return yield* client.configurations.createConfiguration({
      payload: request,
    });
  });
}

export function deleteConfigurationForUrl(baseUrl: string, id: string) {
  return E.gen(function* () {
    const client = yield* makeHttpApiClientForUrl(baseUrl);

    yield* client.configurations.deleteConfiguration({
      params: {
        id,
      },
    });
  });
}

export function getConfigurations() {
  return getConfigurationsForUrl(getApiBaseUrl());
}

export function getConfiguration(id: string) {
  return getConfigurationForUrl(getApiBaseUrl(), id);
}

export function createConfiguration(request: CreateConfigurationApiRequest) {
  return createConfigurationForUrl(getApiBaseUrl(), request);
}

export function deleteConfiguration(id: string) {
  return deleteConfigurationForUrl(getApiBaseUrl(), id);
}

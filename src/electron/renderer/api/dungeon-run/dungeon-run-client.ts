import * as E from "effect/Effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";

import { AppHttpApi } from "@/api/http/http-api.ts";
import { getApiBaseUrl } from "@/electron/renderer/api/api-url.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id-schema.ts";

type GetDungeonRunHistoryArgs = {
  readonly configurationId: ConfigurationId;
};

function makeHttpApiClient(baseUrl: string) {
  return HttpApiClient.make(AppHttpApi, {
    baseUrl,
  }).pipe(E.provide(FetchHttpClient.layer));
}

export function getDungeonRunHistoryBase(baseUrl: string) {
  return ({ configurationId }: GetDungeonRunHistoryArgs) => {
    return E.gen(function* () {
      const client = yield* makeHttpApiClient(baseUrl);

      return yield* client.dungeonRuns.getDungeonRunHistory({
        params: {
          configurationId,
        },
      });
    });
  };
}

export function getDungeonRunHistory(args: GetDungeonRunHistoryArgs) {
  return getDungeonRunHistoryBase(getApiBaseUrl())(args);
}

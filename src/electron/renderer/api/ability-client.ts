import * as E from "effect/Effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";

import { AppHttpApi } from "@/api/http/http-api.ts";

// import { getApiBaseUrl } from "@/electron/renderer/api/api-url.ts";

type AbilityIdArgs = {
  readonly id: string;
};

function makeHttpApiClient(baseUrl: string) {
  return HttpApiClient.make(AppHttpApi, {
    baseUrl,
  }).pipe(E.provide(FetchHttpClient.layer));
}

export function getAbilitiesBase(baseUrl: string) {
  return () => {
    return E.gen(function* () {
      const client = yield* makeHttpApiClient(baseUrl);

      return yield* client.abilities.getAbilities();
    });
  };
}

export function getAbilityBase(baseUrl: string) {
  return ({ id }: AbilityIdArgs) => {
    return E.gen(function* () {
      const client = yield* makeHttpApiClient(baseUrl);

      return yield* client.abilities.getAbility({
        params: {
          id,
        },
      });
    });
  };
}

// function getAbilities() {
//   return getAbilitiesBase(getApiBaseUrl())();
// }

// function getAbility(args: AbilityIdArgs) {
//   return getAbilityBase(getApiBaseUrl())(args);
// }

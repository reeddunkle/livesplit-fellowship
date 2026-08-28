import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Option from "effect/Option";
import type * as Schema from "effect/Schema";
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore";

import {
  type AppState,
  AppStateSchema,
  DEFAULT_APP_STATE,
} from "@/electron/renderer/stores/app-state/app-state-schema.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

const APP_STATE_KEY = "app-state";

export type AppStateStoreError =
  | KeyValueStore.KeyValueStoreError
  | Schema.SchemaError;

export type AppStateStoreShape = {
  readonly get: E.Effect<AppState, AppStateStoreError>;

  readonly set: (state: AppState) => E.Effect<void, AppStateStoreError>;

  readonly setSelectedConfigurationId: (
    configurationId: ConfigurationId | null,
  ) => E.Effect<void, AppStateStoreError>;
};

export class AppStateStore extends Context.Service<
  AppStateStore,
  AppStateStoreShape
>()("app/AppStateStore") {}

export const makeAppStateStore = E.gen(function* () {
  const keyValueStore = yield* KeyValueStore.KeyValueStore;

  const appStateStore = KeyValueStore.toSchemaStore(
    keyValueStore,
    AppStateSchema,
  );

  const get = appStateStore.get(APP_STATE_KEY).pipe(
    E.map(
      Option.getOrElse(() => {
        return DEFAULT_APP_STATE;
      }),
    ),
  );

  const set: AppStateStoreShape["set"] = (state) => {
    return appStateStore.set(APP_STATE_KEY, state);
  };

  const setSelectedConfigurationId: AppStateStoreShape["setSelectedConfigurationId"] =
    (configurationId) => {
      return E.gen(function* () {
        const state = yield* get;

        yield* set({
          ...state,
          selectedConfigurationId: configurationId,
        });
      });
    };

  return {
    get,
    set,
    setSelectedConfigurationId,
  } satisfies AppStateStoreShape;
});

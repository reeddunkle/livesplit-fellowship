import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Option from "effect/Option";
import type * as Schema from "effect/Schema";
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore";

import { type ConfigurationId } from "@/validation/configuration/configuration-id-schema.ts";

import {
  type AppState,
  AppStateSchema,
  DEFAULT_APP_STATE,
} from "./app-state-schema.ts";

const APP_STATE_KEY = "app-state";

export type AppStateStorageError =
  | KeyValueStore.KeyValueStoreError
  | Schema.SchemaError;

export type AppStateStorageShape = {
  readonly get: E.Effect<AppState, AppStateStorageError>;

  readonly set: (state: AppState) => E.Effect<void, AppStateStorageError>;

  readonly setSelectedConfigurationId: (
    id: ConfigurationId | null,
  ) => E.Effect<void, AppStateStorageError>;

  readonly setSidebarOpen: (
    sidebarOpen: AppState["sidebarOpen"],
  ) => E.Effect<void, AppStateStorageError>;

  readonly setTheme: (
    theme: AppState["theme"],
  ) => E.Effect<void, AppStateStorageError>;
};

export class AppStateStorage extends Context.Service<
  AppStateStorage,
  AppStateStorageShape
>()("app/AppStateStorage") {}

export const makeAppStateStorage = E.gen(function* () {
  const keyValueStore = yield* KeyValueStore.KeyValueStore;

  const appStateStorage = KeyValueStore.toSchemaStore(
    keyValueStore,
    AppStateSchema,
  );

  const get = appStateStorage.get(APP_STATE_KEY).pipe(
    E.map(
      Option.getOrElse(() => {
        return DEFAULT_APP_STATE;
      }),
    ),
    E.catchTag("SchemaError", (error) => {
      return E.logWarning("Invalid persisted app state. Using defaults.", {
        error,
      }).pipe(E.as(DEFAULT_APP_STATE));
    }),
  );

  const set: AppStateStorageShape["set"] = (state) => {
    return appStateStorage.set(APP_STATE_KEY, state);
  };

  const update = (
    updateState: (state: AppState) => AppState,
  ): E.Effect<void, AppStateStorageError> => {
    return E.gen(function* () {
      const state = yield* get;

      yield* set(updateState(state));
    });
  };

  const setSelectedConfigurationId: AppStateStorageShape["setSelectedConfigurationId"] =
    (id) => {
      return update((state) => {
        return {
          ...state,
          selectedConfigurationId: id,
        };
      });
    };

  const setSidebarOpen: AppStateStorageShape["setSidebarOpen"] = (
    sidebarOpen,
  ) => {
    return update((state) => {
      return {
        ...state,
        sidebarOpen,
      };
    });
  };

  const setTheme: AppStateStorageShape["setTheme"] = (theme) => {
    return update((state) => {
      return {
        ...state,
        theme,
      };
    });
  };

  return {
    get,
    set,
    setSelectedConfigurationId,
    setSidebarOpen,
    setTheme,
  } satisfies AppStateStorageShape;
});

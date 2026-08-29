import * as Context from "effect/Context";
import * as E from "effect/Effect";
import * as Option from "effect/Option";
import type * as Schema from "effect/Schema";
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore";

import { type ConfigurationFingerprint } from "@/validation/configuration/configuration-fingerprint.ts";

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

  readonly setSelectedConfigurationFingerprint: (
    fingerprint: ConfigurationFingerprint | null,
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
  );

  const set: AppStateStorageShape["set"] = (state) => {
    return appStateStorage.set(APP_STATE_KEY, state);
  };

  const setSelectedConfigurationFingerprint: AppStateStorageShape["setSelectedConfigurationFingerprint"] =
    (fingerprint) => {
      return E.gen(function* () {
        const state = yield* get;

        yield* set({
          ...state,
          selectedConfigurationFingerprint: fingerprint,
        });
      });
    };

  return {
    get,
    set,
    setSelectedConfigurationFingerprint,
  } satisfies AppStateStorageShape;
});

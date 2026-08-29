import * as E from "effect/Effect";

import { browserRuntime } from "@/electron/renderer/runtimes/browser-runtime.ts";
import {
  type AppState,
  DEFAULT_APP_STATE,
} from "@/electron/renderer/storage/app-state/app-state-schema.ts";
import { AppStateStorage } from "@/electron/renderer/storage/app-state/app-state-storage.ts";
import { type ConfigurationFingerprint } from "@/validation/configuration/configuration-fingerprint.ts";

type Listener = () => void;

export type AppStoreActions = {
  readonly setSelectedConfigurationFingerprint: (
    selectedConfigurationFingerprint: ConfigurationFingerprint | null,
  ) => void;
};

export type AppStore = {
  readonly getSnapshot: () => AppState;
  readonly subscribe: (listener: Listener) => () => void;
} & AppStoreActions;

export function makeAppStore(): AppStore {
  let snapshot: AppState = DEFAULT_APP_STATE;
  let isInitialized = false;
  let initialization: ReturnType<typeof browserRuntime.runFork> | undefined;

  const listeners = new Set<Listener>();

  function emit(): void {
    listeners.forEach((listener) => {
      listener();
    });
  }

  function updateSnapshot(update: (state: AppState) => AppState): void {
    snapshot = update(snapshot);
    emit();
  }

  function persist(state: AppState): void {
    browserRuntime.runFork(
      E.gen(function* () {
        const storage = yield* AppStateStorage;

        yield* storage.set(state);
      }).pipe(E.catchCause(E.logError)),
    );
  }

  function initialize(): void {
    if (isInitialized || initialization !== undefined) {
      return;
    }

    initialization = browserRuntime.runFork(
      E.gen(function* () {
        const storage = yield* AppStateStorage;
        const state = yield* storage.get;

        updateSnapshot(() => state);

        isInitialized = true;
      }).pipe(
        E.catchCause(E.logError),
        E.ensuring(
          E.sync(() => {
            initialization = undefined;
          }),
        ),
      ),
    );
  }

  function setSelectedConfigurationFingerprint(
    selectedConfigurationFingerprint: ConfigurationFingerprint | null,
  ): void {
    updateSnapshot((state) => {
      return {
        ...state,
        selectedConfigurationFingerprint,
      };
    });

    persist(snapshot);
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);

    initialize();

    return () => {
      listeners.delete(listener);
    };
  }

  function getSnapshot(): AppState {
    return snapshot;
  }

  return {
    getSnapshot,
    setSelectedConfigurationFingerprint,
    subscribe,
  };
}

export const appStore = makeAppStore();

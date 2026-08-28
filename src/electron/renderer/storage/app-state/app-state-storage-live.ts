import * as Layer from "effect/Layer";
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore";

import { AppStateStorage, makeAppStateStorage } from "./app-state-storage.ts";

const LocalStorageLive = KeyValueStore.layerStorage(() => {
  return localStorage;
});

export const AppStateStorageLive = Layer.effect(
  AppStateStorage,
  makeAppStateStorage,
).pipe(Layer.provide(LocalStorageLive));

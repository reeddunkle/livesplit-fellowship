import * as Layer from "effect/Layer";
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore";

import {
  AppStateStore,
  makeAppStateStore,
} from "@/electron/renderer/stores/app-state/app-state-store.ts";

const LocalStorageLive = KeyValueStore.layerStorage(() => {
  return localStorage;
});

export const AppStateStoreLive = Layer.effect(
  AppStateStore,
  makeAppStateStore,
).pipe(Layer.provide(LocalStorageLive));

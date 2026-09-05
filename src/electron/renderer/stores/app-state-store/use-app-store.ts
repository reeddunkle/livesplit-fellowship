import { useSyncExternalStore } from "react";

import { type AppState } from "../../storage/app-state/persistence/app-state-v1-schema.ts";
import { type AppStoreActions, appStore } from "./app-state-store.ts";

export type UseAppStoreResult = AppState & AppStoreActions;

export function useAppStore(): UseAppStoreResult {
  const state = useSyncExternalStore(appStore.subscribe, appStore.getSnapshot);

  return {
    ...state,
    setDungeonRunVisibleTimeColumns: appStore.setDungeonRunVisibleTimeColumns,
    setSelectedConfigurationId: appStore.setSelectedConfigurationId,
    setSidebarOpen: appStore.setSidebarOpen,
    setTheme: appStore.setTheme,
  };
}

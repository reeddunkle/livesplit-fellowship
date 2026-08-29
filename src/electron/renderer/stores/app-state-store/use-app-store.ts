import { useSyncExternalStore } from "react";

import { type AppState } from "../../storage/app-state/app-state-schema.ts";
import { type AppStoreActions, appStore } from "./app-state-store.ts";

export type UseAppStoreResult = AppState & AppStoreActions;

export function useAppStore(): UseAppStoreResult {
  const state = useSyncExternalStore(appStore.subscribe, appStore.getSnapshot);

  return {
    ...state,
    setSelectedConfigurationId: appStore.setSelectedConfigurationId,
    setSidebarOpen: appStore.setSidebarOpen,
    setTheme: appStore.setTheme,
  };
}

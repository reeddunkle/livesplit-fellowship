import {
  createContext,
  type ReactNode,
  useContext,
  useSyncExternalStore,
} from "react";

import {
  type RunEventStoreSnapshot,
  runEventStore,
} from "@/electron/renderer/stores/run-event-store/run-event-store.ts";

type RunEventProviderProps = {
  readonly children: ReactNode;
};

const RunEventContext = createContext<RunEventStoreSnapshot | undefined>(
  undefined,
);

export function RunEventProvider({ children }: RunEventProviderProps) {
  const snapshot = useSyncExternalStore(
    runEventStore.subscribe,
    runEventStore.getSnapshot,
  );

  return (
    <RunEventContext.Provider value={snapshot}>
      {children}
    </RunEventContext.Provider>
  );
}

export function useRunEventStore(): RunEventStoreSnapshot {
  const context = useContext(RunEventContext);

  if (context === undefined) {
    throw new Error("useRunEventStore must be used within a RunEventProvider.");
  }

  return context;
}

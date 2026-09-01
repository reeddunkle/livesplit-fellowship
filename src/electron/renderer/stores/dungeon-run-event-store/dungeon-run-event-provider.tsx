import {
  createContext,
  type ReactNode,
  useContext,
  useSyncExternalStore,
} from "react";

import {
  type DungeonRunEventStoreSnapshot,
  dungeonRunEventStore,
} from "@/electron/renderer/stores/dungeon-run-event-store/dungeon-run-event-store";

type DungeonRunEventProviderProps = {
  readonly children: ReactNode;
};

const DungeonRunEventContext = createContext<
  DungeonRunEventStoreSnapshot | undefined
>(undefined);

export function DungeonRunEventProvider({
  children,
}: DungeonRunEventProviderProps) {
  const snapshot = useSyncExternalStore(
    dungeonRunEventStore.subscribe,
    dungeonRunEventStore.getSnapshot,
  );

  return (
    <DungeonRunEventContext.Provider value={snapshot}>
      {children}
    </DungeonRunEventContext.Provider>
  );
}

export function useDungeonRunEventStore(): DungeonRunEventStoreSnapshot {
  const context = useContext(DungeonRunEventContext);

  if (context === undefined) {
    throw new Error(
      "useDungeonRunEventStore must be used within a RunEventProvider.",
    );
  }

  return context;
}

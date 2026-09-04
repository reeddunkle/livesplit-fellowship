import * as A from "effect/Array";
import * as E from "effect/Effect";
import * as Option from "effect/Option";
import {
  createContext,
  type ReactNode,
  startTransition,
  useActionState,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  type DungeonRunObservationApi,
  type DungeonRunStateApi,
} from "@/api/websocket/dungeon-run/dungeon-run-api-message-schema.ts";
import { type ApiConnectionState } from "@/electron/renderer/api/common.ts";
import * as dungeonRunClient from "@/electron/renderer/api/dungeon-run/dungeon-run-client.ts";
import {
  type DungeonRunEventStoreSnapshot,
  dungeonRunEventStore,
} from "@/electron/renderer/stores/dungeon-run-store/dungeon-run-event-store";
import { type DungeonRunApiHistory } from "@/services/api/dungeon-run/dungeon-run-api-schema.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id-schema.ts";

type LoadDungeonRunHistoryActionInput = {
  readonly configurationId: ConfigurationId;
};

type DungeonRunHistoryActionResult = {
  readonly error: unknown | undefined;
  readonly history: DungeonRunApiHistory | null;
};

type DungeonRunContextValue = {
  readonly connectionState: ApiConnectionState;
  readonly history: DungeonRunApiHistory | null;
  readonly historyError: unknown | undefined;
  readonly isLoadingHistory: boolean;
  readonly loadHistory: (configurationId: ConfigurationId) => void;
  readonly runState: DungeonRunEventStoreSnapshot["runState"];
};

type DungeonRunProviderProps = {
  readonly children: ReactNode;
};

export type DungeonRunActions = {
  readonly loadHistory: (configurationId: ConfigurationId) => void;
};

export type DungeonRunActionState = {
  readonly historyError: unknown | undefined;
  readonly isLoadingHistory: boolean;
};

export type DungeonRunServerState = {
  readonly connectionState: ApiConnectionState;
  readonly dungeonRun: DungeonRunStateApi["dungeonRun"];
  readonly history: DungeonRunApiHistory | null;
  readonly latestObservation: DungeonRunObservationApi | undefined;
  readonly observations: ReadonlyArray<DungeonRunObservationApi>;
  readonly runState: DungeonRunEventStoreSnapshot["runState"];
};

const INITIAL_DUNGEON_RUN_HISTORY_ACTION_RESULT: DungeonRunHistoryActionResult =
  {
    error: undefined,
    history: null,
  };

const DungeonRunContext = createContext<DungeonRunContextValue | undefined>(
  undefined,
);

export function DungeonRunProvider({ children }: DungeonRunProviderProps) {
  const dungeonRunSnapshot = useSyncExternalStore(
    dungeonRunEventStore.subscribe,
    dungeonRunEventStore.getSnapshot,
  );

  const [historyState, dispatchLoadHistory, isLoadingHistory] = useActionState(
    (
      _previousState: DungeonRunHistoryActionResult,
      input: LoadDungeonRunHistoryActionInput,
    ): Promise<DungeonRunHistoryActionResult> => {
      return dungeonRunClient
        .getDungeonRunHistory({
          configurationId: input.configurationId,
        })
        .pipe(
          E.map((history) => {
            return {
              error: undefined,
              history,
            };
          }),
          E.catch((error) => {
            return E.succeed({
              error,
              history: null,
            });
          }),
          E.runPromise,
        );
    },
    INITIAL_DUNGEON_RUN_HISTORY_ACTION_RESULT,
  );

  const contextValue = useMemo<DungeonRunContextValue>(() => {
    return {
      connectionState: dungeonRunSnapshot.connectionState,
      history: historyState.history,
      historyError: historyState.error,
      isLoadingHistory,
      loadHistory: (configurationId) => {
        startTransition(() => {
          dispatchLoadHistory({
            configurationId,
          });
        });
      },
      runState: dungeonRunSnapshot.runState,
    };
  }, [
    dispatchLoadHistory,
    dungeonRunSnapshot.connectionState,
    dungeonRunSnapshot.runState,
    historyState.error,
    historyState.history,
    isLoadingHistory,
  ]);

  return (
    <DungeonRunContext.Provider value={contextValue}>
      {children}
    </DungeonRunContext.Provider>
  );
}

function useDungeonRunContext(): DungeonRunContextValue {
  const context = useContext(DungeonRunContext);

  if (context === undefined) {
    throw new Error(
      "Dungeon run hooks must be used within a DungeonRunProvider.",
    );
  }

  return context;
}

export function useDungeonRunActions(): DungeonRunActions {
  const { loadHistory } = useDungeonRunContext();

  return {
    loadHistory,
  };
}

export function useDungeonRunActionState(): DungeonRunActionState {
  const { historyError, isLoadingHistory } = useDungeonRunContext();

  return {
    historyError,
    isLoadingHistory,
  };
}

export function useDungeonRunServerState(): DungeonRunServerState {
  const { connectionState, history, runState } = useDungeonRunContext();

  const observations = runState?.observations ?? [];

  return {
    connectionState,
    dungeonRun: runState?.dungeonRun ?? null,
    history,
    latestObservation: A.last(observations).pipe(Option.getOrUndefined),
    observations,
    runState,
  };
}

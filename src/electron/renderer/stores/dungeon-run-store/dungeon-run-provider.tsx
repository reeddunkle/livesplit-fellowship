import * as A from "effect/Array";
import * as E from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  createContext,
  type ReactNode,
  startTransition,
  useActionState,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  type DungeonRunObservationApi,
  type DungeonRunStateApi,
} from "@/api/websocket/dungeon-run/dungeon-run-api-message-schema.ts";
import { type ApiConnectionState } from "@/electron/renderer/api/common.ts";
import * as dungeonRunClient from "@/electron/renderer/api/dungeon-run/dungeon-run-client.ts";
import { type DungeonRunComparison } from "@/electron/renderer/components/dungeon-run/dungeon-run-time.ts";
import {
  type DungeonRunEventStoreSnapshot,
  dungeonRunEventStore,
} from "@/electron/renderer/stores/dungeon-run-store/dungeon-run-event-store";
import {
  type DungeonRunApiHistory,
  type DungeonRunApiObservationStatistics,
} from "@/services/api/dungeon-run/dungeon-run-api-schema.ts";
import {
  RequirementObservationIdentityFromStringSchema,
  RequirementObservationOccurrenceIdentityFromStringSchema,
} from "@/validation/common/requirement-observation-identity-schema.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id-schema.ts";

export type DungeonRunMilestoneKey = string;

type DungeonRunMilestoneExpansionState = {
  readonly defaultIsExpanded: boolean;
  readonly overrides: ReadonlySet<DungeonRunMilestoneKey>;
};

export const DUNGEON_RUN_TIME_COLUMN = {
  DELTA: "DELTA",
  SEGMENT: "SEGMENT",
  TOTAL: "TOTAL",
} as const;

export type DungeonRunTimeColumn =
  (typeof DUNGEON_RUN_TIME_COLUMN)[keyof typeof DUNGEON_RUN_TIME_COLUMN];

export type DungeonRunDisplayState = {
  readonly collapseAllMilestones: () => void;
  readonly comparison: DungeonRunComparison;
  readonly expandAllMilestones: () => void;
  readonly isMilestoneExpanded: (
    milestoneKey: DungeonRunMilestoneKey,
  ) => boolean;
  readonly setComparison: (comparison: DungeonRunComparison) => void;
  readonly setMilestoneExpanded: (
    milestoneKey: DungeonRunMilestoneKey,
    isExpanded: boolean,
  ) => void;
  readonly setTimeColumnVisible: (
    column: DungeonRunTimeColumn,
    isVisible: boolean,
  ) => void;
  readonly visibleTimeColumns: ReadonlySet<DungeonRunTimeColumn>;
};

type LoadDungeonRunHistoryActionInput = {
  readonly configurationId: ConfigurationId;
};

type DungeonRunHistoryActionResult = {
  readonly error: unknown | undefined;
  readonly history: DungeonRunApiHistory | null;
};

type DungeonRunContextValue = {
  readonly collapseAllMilestones: () => void;
  readonly comparison: DungeonRunComparison;
  readonly connectionState: ApiConnectionState;
  readonly expandAllMilestones: () => void;
  readonly history: DungeonRunApiHistory | null;
  readonly historyError: unknown | undefined;
  readonly isLoadingHistory: boolean;
  readonly isMilestoneExpanded: (
    milestoneKey: DungeonRunMilestoneKey,
  ) => boolean;
  readonly loadHistory: (configurationId: ConfigurationId) => void;
  readonly runState: DungeonRunEventStoreSnapshot["runState"];
  readonly setComparison: (comparison: DungeonRunComparison) => void;
  readonly setMilestoneExpanded: (
    milestoneKey: DungeonRunMilestoneKey,
    isExpanded: boolean,
  ) => void;
  readonly setTimeColumnVisible: (
    column: DungeonRunTimeColumn,
    isVisible: boolean,
  ) => void;
  readonly visibleTimeColumns: ReadonlySet<DungeonRunTimeColumn>;
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

export type DungeonRunObservationAnalytics = {
  readonly bestElapsedMilliseconds: number;
  readonly meanElapsedMilliseconds: number;
  readonly medianElapsedMilliseconds: number;
  readonly sampleCount: number;
};

export type DungeonRunObservationInterpretation = {
  readonly analytics: DungeonRunObservationAnalytics | undefined;
  readonly elapsedFromPreviousObservationMilliseconds: number | undefined;
  readonly elapsedFromStartMilliseconds: number | undefined;
  readonly observation: DungeonRunObservationApi;
  readonly occurrence: number;
  readonly previousObservation: DungeonRunObservationApi | undefined;
};

export type DungeonRunInterpretationState = {
  readonly latestObservation: DungeonRunObservationInterpretation | undefined;
  readonly observations: ReadonlyArray<DungeonRunObservationInterpretation>;
};

const INITIAL_DUNGEON_RUN_HISTORY_ACTION_RESULT: DungeonRunHistoryActionResult =
  {
    error: undefined,
    history: null,
  };

const DungeonRunContext = createContext<DungeonRunContextValue | undefined>(
  undefined,
);

const encodeRequirementObservationIdentity = Schema.encodeSync(
  RequirementObservationIdentityFromStringSchema,
);

const encodeRequirementObservationOccurrenceIdentity = Schema.encodeSync(
  RequirementObservationOccurrenceIdentityFromStringSchema,
);

function createObservationAnalytics(
  statistics: DungeonRunApiObservationStatistics,
): DungeonRunObservationAnalytics {
  return {
    bestElapsedMilliseconds: statistics.bestElapsedMilliseconds,
    meanElapsedMilliseconds: statistics.meanElapsedMilliseconds,
    medianElapsedMilliseconds: statistics.medianElapsedMilliseconds,
    sampleCount: statistics.sampleCount,
  };
}

export function DungeonRunProvider({ children }: DungeonRunProviderProps) {
  const dungeonRunSnapshot = useSyncExternalStore(
    dungeonRunEventStore.subscribe,
    dungeonRunEventStore.getSnapshot,
  );

  const [milestoneExpansionState, setMilestoneExpansionState] =
    useState<DungeonRunMilestoneExpansionState>({
      defaultIsExpanded: false,
      overrides: new Set(),
    });

  const expandAllMilestones = useCallback(() => {
    setMilestoneExpansionState({
      defaultIsExpanded: true,
      overrides: new Set(),
    });
  }, []);

  const collapseAllMilestones = useCallback(() => {
    setMilestoneExpansionState({
      defaultIsExpanded: false,
      overrides: new Set(),
    });
  }, []);

  const isMilestoneExpanded = useCallback(
    (milestoneKey: DungeonRunMilestoneKey) => {
      const isOverridden = milestoneExpansionState.overrides.has(milestoneKey);

      return isOverridden
        ? !milestoneExpansionState.defaultIsExpanded
        : milestoneExpansionState.defaultIsExpanded;
    },
    [milestoneExpansionState],
  );

  const setMilestoneExpanded = useCallback(
    (milestoneKey: DungeonRunMilestoneKey, isExpanded: boolean) => {
      setMilestoneExpansionState((currentState) => {
        const overrides = new Set(currentState.overrides);

        if (isExpanded === currentState.defaultIsExpanded) {
          overrides.delete(milestoneKey);
        } else {
          overrides.add(milestoneKey);
        }

        return {
          ...currentState,
          overrides,
        };
      });
    },
    [],
  );

  const [comparison, setComparison] = useState<DungeonRunComparison>("BEST");

  const [visibleTimeColumns, setVisibleTimeColumns] = useState<
    ReadonlySet<DungeonRunTimeColumn>
  >(() => {
    return new Set([
      DUNGEON_RUN_TIME_COLUMN.DELTA,
      DUNGEON_RUN_TIME_COLUMN.SEGMENT,
      DUNGEON_RUN_TIME_COLUMN.TOTAL,
    ]);
  });

  const setTimeColumnVisible = useCallback(
    (column: DungeonRunTimeColumn, isVisible: boolean) => {
      setVisibleTimeColumns((currentVisibleTimeColumns) => {
        const nextVisibleTimeColumns = new Set(currentVisibleTimeColumns);

        if (isVisible) {
          nextVisibleTimeColumns.add(column);
        } else {
          nextVisibleTimeColumns.delete(column);
        }

        return nextVisibleTimeColumns;
      });
    },
    [],
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
      collapseAllMilestones,
      comparison,
      connectionState: dungeonRunSnapshot.connectionState,
      expandAllMilestones,
      history: historyState.history,
      historyError: historyState.error,
      isLoadingHistory,
      isMilestoneExpanded,
      loadHistory: (configurationId) => {
        startTransition(() => {
          dispatchLoadHistory({
            configurationId,
          });
        });
      },
      runState: dungeonRunSnapshot.runState,
      setComparison,
      setMilestoneExpanded,
      setTimeColumnVisible,
      visibleTimeColumns,
    };
  }, [
    collapseAllMilestones,
    comparison,
    dispatchLoadHistory,
    dungeonRunSnapshot.connectionState,
    dungeonRunSnapshot.runState,
    expandAllMilestones,
    historyState.error,
    historyState.history,
    isLoadingHistory,
    isMilestoneExpanded,
    setMilestoneExpanded,
    setTimeColumnVisible,
    visibleTimeColumns,
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

export function useDungeonRunInterpretationState(): DungeonRunInterpretationState {
  const { dungeonRun, history, observations } = useDungeonRunServerState();

  return useMemo(() => {
    const historicalStatisticsByKey = A.reduce(
      history?.observations ?? [],
      new Map<string, DungeonRunApiObservationStatistics>(),
      (accumulator, statistics) => {
        const key = encodeRequirementObservationOccurrenceIdentity([
          statistics.type,
          statistics.targetId,
          statistics.occurrence,
        ]);

        accumulator.set(key, statistics);

        return accumulator;
      },
    );

    const interpretationResult = A.reduce(
      observations,
      {
        observations: [] as Array<DungeonRunObservationInterpretation>,
        occurrencesByIdentity: new Map<string, number>(),
      },
      (accumulator, observation) => {
        const observationIdentityKey = encodeRequirementObservationIdentity([
          observation.type,
          observation.targetId,
        ]);

        const occurrence =
          (accumulator.occurrencesByIdentity.get(observationIdentityKey) ?? 0) +
          1;

        accumulator.occurrencesByIdentity.set(
          observationIdentityKey,
          occurrence,
        );

        const previousObservation = A.last(accumulator.observations).pipe(
          Option.getOrUndefined,
        )?.observation;

        const elapsedFromStartMilliseconds =
          dungeonRun?.startedAtMilliseconds === null ||
          dungeonRun?.startedAtMilliseconds === undefined
            ? undefined
            : observation.timestampMilliseconds -
              dungeonRun.startedAtMilliseconds;

        const elapsedFromPreviousObservationMilliseconds =
          previousObservation === undefined
            ? undefined
            : observation.timestampMilliseconds -
              previousObservation.timestampMilliseconds;

        const historicalStatistics = historicalStatisticsByKey.get(
          encodeRequirementObservationOccurrenceIdentity([
            observation.type,
            observation.targetId,
            occurrence,
          ]),
        );

        accumulator.observations.push({
          analytics:
            historicalStatistics === undefined
              ? undefined
              : createObservationAnalytics(historicalStatistics),
          elapsedFromPreviousObservationMilliseconds,
          elapsedFromStartMilliseconds,
          observation,
          occurrence,
          previousObservation,
        });

        return accumulator;
      },
    );

    return {
      latestObservation: A.last(interpretationResult.observations).pipe(
        Option.getOrUndefined,
      ),
      observations: interpretationResult.observations,
    };
  }, [dungeonRun?.startedAtMilliseconds, history, observations]);
}

export function useDungeonRunDisplayState(): DungeonRunDisplayState {
  const {
    collapseAllMilestones,
    comparison,
    expandAllMilestones,
    isMilestoneExpanded,
    setComparison,
    setMilestoneExpanded,
    setTimeColumnVisible,
    visibleTimeColumns,
  } = useDungeonRunContext();

  return {
    collapseAllMilestones,
    comparison,
    expandAllMilestones,
    isMilestoneExpanded,
    setComparison,
    setMilestoneExpanded,
    setTimeColumnVisible,
    visibleTimeColumns,
  };
}

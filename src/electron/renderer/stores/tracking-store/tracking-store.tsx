import * as E from "effect/Effect";
import {
  createContext,
  type ReactNode,
  startTransition,
  useActionState,
  useContext,
  useMemo,
} from "react";

import * as trackingClient from "@/electron/renderer/api/tracking-client.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

type StartTrackingActionInput = {
  readonly configurationId: ConfigurationId;
};

type TrackingActionState = {
  readonly error: unknown | undefined;
};

type TrackingActionContextValue = {
  readonly isStarting: boolean;
  readonly isStopping: boolean;
  readonly start: (configurationId: ConfigurationId) => void;
  readonly startError: unknown | undefined;
  readonly stop: () => void;
  readonly stopError: unknown | undefined;
};

type TrackingProviderProps = {
  readonly children: ReactNode;
};

export type TrackingActionStatus = {
  readonly isStarting: boolean;
  readonly isStopping: boolean;
  readonly startError: unknown | undefined;
  readonly stopError: unknown | undefined;
};

const INITIAL_TRACKING_ACTION_STATE: TrackingActionState = {
  error: undefined,
};

const TrackingActionContext = createContext<
  TrackingActionContextValue | undefined
>(undefined);

export function TrackingProvider({ children }: TrackingProviderProps) {
  const [startState, dispatchStart, isStarting] = useActionState(
    (
      _previousState: TrackingActionState,
      input: StartTrackingActionInput,
    ): Promise<TrackingActionState> => {
      return trackingClient
        .startTracking({
          configurationId: input.configurationId,
        })
        .pipe(
          E.as({
            error: undefined,
          }),
          E.catch((error) => {
            return E.succeed({
              error,
            });
          }),
          E.runPromise,
        );
    },
    INITIAL_TRACKING_ACTION_STATE,
  );

  const [stopState, dispatchStop, isStopping] = useActionState(
    (): Promise<TrackingActionState> => {
      return trackingClient.stopTracking().pipe(
        E.as({
          error: undefined,
        }),
        E.catch((error) => {
          return E.succeed({
            error,
          });
        }),
        E.runPromise,
      );
    },
    INITIAL_TRACKING_ACTION_STATE,
  );

  const actionContextValue = useMemo<TrackingActionContextValue>(() => {
    return {
      isStarting,
      isStopping,
      start: (configurationId) => {
        startTransition(() => {
          dispatchStart({
            configurationId,
          });
        });
      },
      startError: startState.error,
      stop: () => {
        startTransition(() => {
          dispatchStop();
        });
      },
      stopError: stopState.error,
    };
  }, [
    dispatchStart,
    dispatchStop,
    isStarting,
    isStopping,
    startState.error,
    stopState.error,
  ]);

  return (
    <TrackingActionContext.Provider value={actionContextValue}>
      {children}
    </TrackingActionContext.Provider>
  );
}

export function useTrackingActions(): TrackingActionContextValue {
  const context = useContext(TrackingActionContext);

  if (context === undefined) {
    throw new Error(
      "useTrackingActions must be used within a TrackingProvider.",
    );
  }

  return context;
}

export function useTrackingActionStatus(): TrackingActionStatus {
  const { isStarting, isStopping, startError, stopError } =
    useTrackingActions();

  return {
    isStarting,
    isStopping,
    startError,
    stopError,
  };
}

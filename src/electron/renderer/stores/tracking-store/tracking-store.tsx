import * as E from "effect/Effect";
import {
  createContext,
  type ReactNode,
  startTransition,
  useActionState,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import { type TrackingApiStatus } from "@/application/tracking/tracking-api-schema.ts";
import { type ApiConnectionState } from "@/electron/renderer/api/dungeon-run-event-stream.ts";
import * as trackingClient from "@/electron/renderer/api/tracking-client.ts";
import { trackingEventStore } from "@/electron/renderer/stores/tracking-store/tracking-event-store.ts";
import { type ConfigurationId } from "@/validation/configuration/configuration-id.ts";

type StartTrackingActionInput = {
  readonly configurationId: ConfigurationId;
};

type TrackingActionState = {
  readonly error: unknown | undefined;
};

type TrackingContextValue = {
  readonly connectionState: ApiConnectionState;
  readonly isStarting: boolean;
  readonly isStopping: boolean;
  readonly start: (configurationId: ConfigurationId) => void;
  readonly startError: unknown | undefined;
  readonly stop: () => void;
  readonly stopError: unknown | undefined;
  readonly trackingStatus: TrackingApiStatus | null;
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

export type TrackingStatus = {
  readonly connectionState: ApiConnectionState;
  readonly trackingStatus: TrackingApiStatus | null;
};

const INITIAL_TRACKING_ACTION_STATE: TrackingActionState = {
  error: undefined,
};

const TrackingContext = createContext<TrackingContextValue | undefined>(
  undefined,
);

export function TrackingProvider({ children }: TrackingProviderProps) {
  const trackingSnapshot = useSyncExternalStore(
    trackingEventStore.subscribe,
    trackingEventStore.getSnapshot,
  );

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

  const contextValue = useMemo<TrackingContextValue>(() => {
    return {
      connectionState: trackingSnapshot.connectionState,
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
      trackingStatus: trackingSnapshot.trackingStatus,
    };
  }, [
    dispatchStart,
    dispatchStop,
    isStarting,
    isStopping,
    startState.error,
    stopState.error,
    trackingSnapshot.connectionState,
    trackingSnapshot.trackingStatus,
  ]);

  return (
    <TrackingContext.Provider value={contextValue}>
      {children}
    </TrackingContext.Provider>
  );
}

function useTrackingContext(): TrackingContextValue {
  const context = useContext(TrackingContext);

  if (context === undefined) {
    throw new Error("Tracking hooks must be used within a TrackingProvider.");
  }

  return context;
}

export function useTrackingActions() {
  const { start, stop } = useTrackingContext();

  return {
    start,
    stop,
  };
}

export function useTrackingActionStatus(): TrackingActionStatus {
  const { isStarting, isStopping, startError, stopError } =
    useTrackingContext();

  return {
    isStarting,
    isStopping,
    startError,
    stopError,
  };
}

export function useTrackingStatus(): TrackingStatus {
  const { connectionState, trackingStatus } = useTrackingContext();

  return {
    connectionState,
    trackingStatus,
  };
}

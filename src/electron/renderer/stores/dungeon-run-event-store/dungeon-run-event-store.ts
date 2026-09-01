import * as E from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Match from "effect/Match";
import * as Stream from "effect/Stream";

import { type DungeonRunStateApi } from "@/api/websocket/dungeon-run-api-message-schema.ts";
import {
  API_CONNECTION_STATE,
  type ApiConnectionState,
  type DungeonRunEventStreamEvent,
  makeDungeonRunEventStream,
} from "@/electron/renderer/api/dungeon-run-event-stream";

export type DungeonRunEventStoreSnapshot = {
  readonly connectionState: ApiConnectionState;
  readonly runState: DungeonRunStateApi | null;
};

type Listener = () => void;

const initialSnapshot: DungeonRunEventStoreSnapshot = {
  connectionState: API_CONNECTION_STATE.DISCONNECTED,
  runState: null,
};

export function makeDungeonRunEventStore() {
  let snapshot = initialSnapshot;
  let fiber: Fiber.Fiber<void, unknown> | undefined;

  const listeners = new Set<Listener>();

  function emit(): void {
    listeners.forEach((listener) => {
      listener();
    });
  }

  function updateSnapshot(
    update: (
      snapshot: DungeonRunEventStoreSnapshot,
    ) => DungeonRunEventStoreSnapshot,
  ): E.Effect<void> {
    return E.sync(() => {
      snapshot = update(snapshot);

      emit();
    });
  }

  const handleDungeonRunEvent = Match.type<DungeonRunEventStreamEvent>().pipe(
    Match.when({ type: "CONNECTION_STATE_CHANGED" }, (event) => {
      return updateSnapshot((snapshot) => {
        return {
          ...snapshot,
          connectionState: event.state,
        };
      });
    }),
    Match.when({ type: "MESSAGE_RECEIVED" }, (event) => {
      return updateSnapshot((snapshot) => {
        return {
          ...snapshot,
          runState: event.message.state,
        };
      });
    }),
    Match.exhaustive,
  );

  function start(): void {
    if (fiber !== undefined) {
      return;
    }

    const program = makeDungeonRunEventStream().pipe(
      Stream.runForEach(handleDungeonRunEvent),
      E.catch((error) => {
        return E.gen(function* () {
          yield* E.logError("Run event stream failed.", {
            error,
          });

          yield* updateSnapshot((snapshot) => {
            return {
              ...snapshot,
              connectionState: API_CONNECTION_STATE.DISCONNECTED,
            };
          });
        });
      }),
      E.ensuring(
        E.sync(() => {
          fiber = undefined;
        }),
      ),
    );

    fiber = E.runFork(program);
  }

  function stop(): void {
    if (fiber === undefined) {
      return;
    }

    E.runFork(Fiber.interrupt(fiber));

    fiber = undefined;
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);

    if (listeners.size === 1) {
      start();
    }

    return () => {
      listeners.delete(listener);

      if (listeners.size === 0) {
        stop();
      }
    };
  }

  function getSnapshot(): DungeonRunEventStoreSnapshot {
    return snapshot;
  }

  return {
    getSnapshot,
    subscribe,
  };
}

export const dungeonRunEventStore = makeDungeonRunEventStore();

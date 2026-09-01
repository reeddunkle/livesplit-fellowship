import type * as Duration from "effect/Duration";
import * as E from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Socket from "effect/unstable/socket/Socket";

import {
  type TrackingApiMessage,
  TrackingApiMessageSchema,
} from "@/api/websocket/tracking-api-message-schema.ts";
import { getApiWebSocketUrl } from "@/electron/renderer/api/api-url.ts";
import { TrackingEventMessageDecodeError } from "@/errors/tracking-event-stream-error.ts";

export const API_CONNECTION_STATE = {
  CONNECTED: "CONNECTED",
  CONNECTING: "CONNECTING",
  DISCONNECTED: "DISCONNECTED",
} as const;

export type ApiConnectionState =
  (typeof API_CONNECTION_STATE)[keyof typeof API_CONNECTION_STATE];

export type TrackingEventStreamEvent =
  | {
      readonly state: ApiConnectionState;
      readonly type: "CONNECTION_STATE_CHANGED";
    }
  | {
      readonly message: TrackingApiMessage;
      readonly type: "MESSAGE_RECEIVED";
    };

export type TrackingEventStreamError =
  | TrackingEventMessageDecodeError
  | Socket.SocketError;

export type MakeTrackingEventStreamOptions = {
  readonly reconnectDelay?: Duration.Input;
};

const DEFAULT_RECONNECT_DELAY = "1 second";

function offerConnectionState(
  queue: Queue.Enqueue<TrackingEventStreamEvent>,
  state: ApiConnectionState,
) {
  return Queue.offer(queue, {
    state,
    type: "CONNECTION_STATE_CHANGED",
  });
}

function decodeMessage(
  message: string,
): E.Effect<TrackingApiMessage, TrackingEventMessageDecodeError> {
  return E.gen(function* () {
    const parsed = yield* E.try({
      catch: (cause) => {
        return new TrackingEventMessageDecodeError({
          cause,
        });
      },
      try: () => {
        return JSON.parse(message) as unknown;
      },
    });

    return yield* Schema.decodeUnknownEffect(TrackingApiMessageSchema)(
      parsed,
    ).pipe(
      E.mapError((cause) => {
        return new TrackingEventMessageDecodeError({
          cause,
        });
      }),
    );
  });
}

export function makeTrackingEventStreamForUrl(
  url: string,
  options: MakeTrackingEventStreamOptions = {},
): Stream.Stream<TrackingEventStreamEvent, TrackingEventStreamError> {
  const reconnectDelay = options.reconnectDelay ?? DEFAULT_RECONNECT_DELAY;

  return Stream.callback<TrackingEventStreamEvent, TrackingEventStreamError>(
    (queue) => {
      const connect = E.gen(function* () {
        yield* offerConnectionState(queue, API_CONNECTION_STATE.CONNECTING);

        const socket = yield* Socket.makeWebSocket(url, {
          closeCodeIsError: (code) => {
            return code !== 1000;
          },
          openTimeout: "5 seconds",
        });

        yield* socket.runString(
          (data) => {
            return E.gen(function* () {
              const message = yield* decodeMessage(data);

              yield* Queue.offer(queue, {
                message,
                type: "MESSAGE_RECEIVED",
              });
            });
          },
          {
            onOpen: offerConnectionState(queue, API_CONNECTION_STATE.CONNECTED),
          },
        );
      }).pipe(
        E.ensuring(
          offerConnectionState(queue, API_CONNECTION_STATE.DISCONNECTED),
        ),
      );

      return connect.pipe(
        E.retry({
          schedule: Schedule.spaced(reconnectDelay),
          while: (error) => {
            return !(error instanceof TrackingEventMessageDecodeError);
          },
        }),
        E.repeat(Schedule.spaced(reconnectDelay)),
        E.catchCause((cause) => {
          return E.sync(() => {
            Queue.failCauseUnsafe(queue, cause);
          });
        }),
        E.provide(Socket.layerWebSocketConstructorGlobal),
      );
    },
  );
}

export function makeTrackingEventStream(): Stream.Stream<
  TrackingEventStreamEvent,
  TrackingEventStreamError
> {
  return makeTrackingEventStreamForUrl(getApiWebSocketUrl());
}

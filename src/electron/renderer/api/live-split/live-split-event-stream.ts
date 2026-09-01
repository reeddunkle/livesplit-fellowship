import type * as Duration from "effect/Duration";
import * as E from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Socket from "effect/unstable/socket/Socket";

import { ROUTES } from "@/api/constants/routes.ts";
import {
  type LiveSplitApiMessage,
  LiveSplitApiMessageSchema,
} from "@/api/websocket/live-split/live-split-api-message-schema.ts";
import { getApiWebSocketUrl } from "@/electron/renderer/api/api-url.ts";
import {
  API_CONNECTION_STATE,
  type ApiConnectionState,
} from "@/electron/renderer/api/common.ts";
import { LiveSplitEventMessageDecodeError } from "@/errors/live-split-event-stream-error.ts";

export type LiveSplitEventStreamEvent =
  | {
      readonly state: ApiConnectionState;
      readonly type: "CONNECTION_STATE_CHANGED";
    }
  | {
      readonly message: LiveSplitApiMessage;
      readonly type: "MESSAGE_RECEIVED";
    };

export type LiveSplitEventStreamError =
  | LiveSplitEventMessageDecodeError
  | Socket.SocketError;

export type MakeLiveSplitEventStreamOptions = {
  readonly reconnectDelay?: Duration.Input;
};

const DEFAULT_RECONNECT_DELAY = "1 second";

function offerConnectionState(
  queue: Queue.Enqueue<LiveSplitEventStreamEvent>,
  state: ApiConnectionState,
) {
  return Queue.offer(queue, {
    state,
    type: "CONNECTION_STATE_CHANGED",
  });
}

function decodeMessage(
  message: string,
): E.Effect<LiveSplitApiMessage, LiveSplitEventMessageDecodeError> {
  return E.gen(function* () {
    const parsed = yield* E.try({
      catch: (cause) => {
        return new LiveSplitEventMessageDecodeError({
          cause,
        });
      },
      try: () => {
        return JSON.parse(message) as unknown;
      },
    });

    return yield* Schema.decodeUnknownEffect(LiveSplitApiMessageSchema)(
      parsed,
    ).pipe(
      E.mapError((cause) => {
        return new LiveSplitEventMessageDecodeError({
          cause,
        });
      }),
    );
  });
}

export function makeLiveSplitEventStreamForUrl(
  url: string,
  options: MakeLiveSplitEventStreamOptions = {},
): Stream.Stream<LiveSplitEventStreamEvent, LiveSplitEventStreamError> {
  const reconnectDelay = options.reconnectDelay ?? DEFAULT_RECONNECT_DELAY;

  return Stream.callback<LiveSplitEventStreamEvent, LiveSplitEventStreamError>(
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
            return !(error instanceof LiveSplitEventMessageDecodeError);
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

export function makeLiveSplitEventStream(): Stream.Stream<
  LiveSplitEventStreamEvent,
  LiveSplitEventStreamError
> {
  return makeLiveSplitEventStreamForUrl(
    getApiWebSocketUrl(ROUTES.liveSplitEvents),
  );
}

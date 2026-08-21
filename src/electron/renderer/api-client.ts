import type * as Duration from "effect/Duration";
import * as E from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Socket from "effect/unstable/socket/Socket";

import { ROUTES } from "@/api/constants/routes.ts";
import {
  type RunApiMessage,
  RunApiMessageSchema,
} from "@/api/validation/run-api-message-schema.ts";
import {
  ApiClientMessageDecodeError,
  ApiClientRequestError,
  ApiClientResponseDecodeError,
  ApiClientResponseStatusError,
} from "@/errors/api-client-error.ts";
import {
  type ConfigurationApiConfigurationList,
  ConfigurationApiConfigurationListSchema,
} from "@/services/api/configuration/configuration-api-schema.ts";
import { parseJson } from "@/util/parse-json.ts";

export const API_CONNECTION_STATE = {
  CONNECTED: "CONNECTED",
  CONNECTING: "CONNECTING",
  DISCONNECTED: "DISCONNECTED",
} as const;

type ApiConnectionState =
  (typeof API_CONNECTION_STATE)[keyof typeof API_CONNECTION_STATE];

export type ApiClientEvent =
  | {
      readonly state: ApiConnectionState;
      readonly type: "CONNECTION_STATE_CHANGED";
    }
  | {
      readonly message: RunApiMessage;
      readonly type: "MESSAGE_RECEIVED";
    };

export type ApiClientEventError =
  | ApiClientMessageDecodeError
  | Socket.SocketError;

export type ApiClientHttpError =
  | ApiClientRequestError
  | ApiClientResponseDecodeError
  | ApiClientResponseStatusError;

export type MakeApiEventStreamOptions = {
  readonly reconnectDelay?: Duration.Input;
};

const DEFAULT_RECONNECT_DELAY = "1 second";

function offerConnectionState(
  queue: Queue.Enqueue<ApiClientEvent>,
  state: ApiConnectionState,
) {
  return Queue.offer(queue, {
    state,
    type: "CONNECTION_STATE_CHANGED",
  });
}

function decodeMessage(
  message: string,
): E.Effect<RunApiMessage, ApiClientMessageDecodeError> {
  return E.gen(function* () {
    const parsed = yield* E.try({
      catch: (cause) => {
        return new ApiClientMessageDecodeError({
          cause,
        });
      },
      try: () => {
        return JSON.parse(message) as unknown;
      },
    });

    return yield* Schema.decodeUnknownEffect(RunApiMessageSchema)(parsed).pipe(
      E.mapError((cause) => {
        return new ApiClientMessageDecodeError({
          cause,
        });
      }),
    );
  });
}

function request(
  url: string,
  options?: RequestInit,
): E.Effect<Response, ApiClientRequestError> {
  return E.tryPromise({
    catch: (cause) => {
      return new ApiClientRequestError({
        cause,
      });
    },
    try: () => {
      return fetch(url, options);
    },
  });
}

function ensureSuccessfulResponse(
  response: Response,
): E.Effect<Response, ApiClientResponseStatusError> {
  if (response.ok) {
    return E.succeed(response);
  }

  return E.fail(
    new ApiClientResponseStatusError({
      status: response.status,
      statusText: response.statusText,
    }),
  );
}

function parseResponseJson(
  response: Response,
): E.Effect<unknown, ApiClientResponseDecodeError> {
  return E.gen(function* () {
    const contents = yield* E.tryPromise({
      catch: (cause) => {
        return new ApiClientResponseDecodeError({
          cause,
        });
      },
      try: () => {
        return response.text();
      },
    });

    return yield* parseJson({
      contents,
      onError: (cause) => {
        return new ApiClientResponseDecodeError({
          cause,
        });
      },
    });
  });
}

export function getConfigurationsForUrl(
  baseUrl: string,
): E.Effect<ConfigurationApiConfigurationList, ApiClientHttpError> {
  return E.gen(function* () {
    const response = yield* request(`${baseUrl}${ROUTES.configurations}`);
    const successfulResponse = yield* ensureSuccessfulResponse(response);
    const json = yield* parseResponseJson(successfulResponse);

    return yield* Schema.decodeUnknownEffect(
      ConfigurationApiConfigurationListSchema,
    )(json).pipe(
      E.mapError((cause) => {
        return new ApiClientResponseDecodeError({
          cause,
        });
      }),
    );
  });
}

export function makeApiEventStreamForUrl(
  url: string,
  options: MakeApiEventStreamOptions = {},
): Stream.Stream<ApiClientEvent, ApiClientEventError> {
  const reconnectDelay = options.reconnectDelay ?? DEFAULT_RECONNECT_DELAY;

  return Stream.callback<ApiClientEvent, ApiClientEventError>((queue) => {
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
      /*
       * Retry socket failures indefinitely. Message decoding failures indicate
       * a protocol/schema problem and should fail the stream instead.
       */
      E.retry({
        schedule: Schedule.spaced(reconnectDelay),
        while: (error) => {
          return !(error instanceof ApiClientMessageDecodeError);
        },
      }),

      /*
       * A socket can also close successfully, such as with WebSocket close
       * code 1000. Reconnect after normal completion as well.
       */
      E.repeat(Schedule.spaced(reconnectDelay)),

      /*
       * Stream.callback communicates failure through its queue. At this point
       * the only expected recoverable-error exclusion is a message decode
       * failure.
       */
      E.catchCause((cause) => {
        return E.sync(() => {
          Queue.failCauseUnsafe(queue, cause);
        });
      }),

      E.provide(Socket.layerWebSocketConstructorGlobal),
    );
  });
}

export function getConfigurations(): E.Effect<
  ConfigurationApiConfigurationList,
  ApiClientHttpError
> {
  const baseUrl = `http://${import.meta.env.API_HOST}:${import.meta.env.API_PORT}`;

  return getConfigurationsForUrl(baseUrl);
}

export function makeApiEventStream(): Stream.Stream<
  ApiClientEvent,
  ApiClientEventError
> {
  const url = `ws://${import.meta.env.API_HOST}:${import.meta.env.API_PORT}${ROUTES.events}`;

  return makeApiEventStreamForUrl(url);
}

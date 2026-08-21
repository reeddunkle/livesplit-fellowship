import type * as Duration from "effect/Duration";
import * as E from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";
import * as Socket from "effect/unstable/socket/Socket";

import { ROUTES } from "@/api/constants/routes.ts";
import { AppHttpApi } from "@/api/http/http-api.ts";
import {
  type RunApiMessage,
  RunApiMessageSchema,
} from "@/api/validation/run-api-message-schema.ts";
import { ApiClientMessageDecodeError } from "@/errors/api-client-error.ts";
import { type CreateConfigurationApiRequest } from "@/services/api/configuration/configuration-api-schema.ts";

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

export type MakeApiEventStreamOptions = {
  readonly reconnectDelay?: Duration.Input;
};

const DEFAULT_RECONNECT_DELAY = "1 second";

function getApiBaseUrl(): string {
  return `http://${import.meta.env.API_HOST}:${import.meta.env.API_PORT}`;
}

function makeHttpApiClient(baseUrl: string) {
  return HttpApiClient.make(AppHttpApi, {
    baseUrl,
  });
}

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

export function getConfigurationsForUrl(baseUrl: string) {
  return E.gen(function* () {
    const client = yield* makeHttpApiClient(baseUrl);

    return yield* client.configurations.getConfigurations();
  }).pipe(E.provide(FetchHttpClient.layer));
}

export function getConfigurationForUrl(baseUrl: string, id: string) {
  return E.gen(function* () {
    const client = yield* makeHttpApiClient(baseUrl);

    return yield* client.configurations.getConfiguration({
      params: {
        id,
      },
    });
  }).pipe(E.provide(FetchHttpClient.layer));
}

export function createConfigurationForUrl(
  baseUrl: string,
  createConfigurationRequest: CreateConfigurationApiRequest,
) {
  return E.gen(function* () {
    const client = yield* makeHttpApiClient(baseUrl);

    return yield* client.configurations.createConfiguration({
      payload: createConfigurationRequest,
    });
  }).pipe(E.provide(FetchHttpClient.layer));
}

export function deleteConfigurationForUrl(baseUrl: string, id: string) {
  return E.gen(function* () {
    const client = yield* makeHttpApiClient(baseUrl);

    yield* client.configurations.deleteConfiguration({
      params: {
        id,
      },
    });
  }).pipe(E.provide(FetchHttpClient.layer));
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

export function getConfigurations() {
  return getConfigurationsForUrl(getApiBaseUrl());
}

export function getConfiguration(id: string) {
  return getConfigurationForUrl(getApiBaseUrl(), id);
}

export function createConfiguration(
  createConfigurationRequest: CreateConfigurationApiRequest,
) {
  return createConfigurationForUrl(getApiBaseUrl(), createConfigurationRequest);
}

export function deleteConfiguration(id: string) {
  return deleteConfigurationForUrl(getApiBaseUrl(), id);
}

export function makeApiEventStream(): Stream.Stream<
  ApiClientEvent,
  ApiClientEventError
> {
  const url = `ws://${import.meta.env.API_HOST}:${import.meta.env.API_PORT}${ROUTES.events}`;

  return makeApiEventStreamForUrl(url);
}

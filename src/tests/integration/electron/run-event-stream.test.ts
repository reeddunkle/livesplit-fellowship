import { NodeHttpServer } from "@effect/platform-node";
import * as Deferred from "effect/Deferred";
import * as E from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as Socket from "effect/unstable/socket/Socket";
import { describe, expect, test } from "vitest";

import { ROUTES } from "@/api/constants/routes.ts";
import { type DungeonRunApiMessage } from "@/api/websocket/dungeon-run-api-message-schema.ts";
import {
  API_CONNECTION_STATE,
  makeRunEventStreamForUrl,
  type RunEventStreamEvent,
} from "@/electron/renderer/api/run-event-stream.ts";
import { RUN_EVENT_MESSAGE_DECODE_ERROR } from "@/errors/run-event-stream-error.ts";
import { WebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
import { ApiServerTest } from "@/tests/common/layers/api-server-test-layer.ts";
import { runTest } from "@/tests/common/run-test.ts";

const TEST_TIMEOUT = "1 second";
const TEST_RECONNECT_DELAY = "10 millis";
const NORMAL_CLOSE_ROUTE = "/normal-close";

const message = {
  state: {
    dungeonRun: {
      startedAtMilliseconds: 1_000,
    },
    milestones: [
      {
        completedAtMilliseconds: null,
        elapsedMilliseconds: null,
        label: "Desecrator 2 Killed",
        milestoneId: "desecrator:killed:2",
        requirements: [
          {
            observations: [],
            requiredCount: 1,
            startOccurrence: 1,
            targetId: "42",
            type: "UNIT_DEATH",
          },
        ],
      },
    ],
  },
  version: 1,
} satisfies DungeonRunApiMessage;

function getWebSocketUrl(address: HttpServer.Address): string {
  if (address._tag === "UnixAddress") {
    throw new Error("WebSocket test does not support Unix socket addresses.");
  }

  const hostname =
    address.hostname === "0.0.0.0" ? "127.0.0.1" : address.hostname;

  return `ws://${hostname}:${address.port}${ROUTES.dungeonRunEvents}`;
}

function collectClientEvents(
  stream: Stream.Stream<RunEventStreamEvent, unknown>,
  count: number,
) {
  return stream.pipe(
    Stream.take(count),
    Stream.runCollect,
    E.map((events) => {
      return Array.from(events);
    }),
    E.timeout(TEST_TIMEOUT),
  );
}

const handleNormalCloseRequest = E.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;

  yield* E.scoped(
    E.gen(function* () {
      const socket = yield* request.upgrade;
      const writer = yield* socket.writer;

      const closeNormally = writer(
        new Socket.CloseEvent(1000, "Normal test disconnect."),
      ).pipe(
        E.catch(() => {
          return E.void;
        }),
      );

      yield* socket
        .runRaw(
          () => {
            return E.void;
          },
          {
            onOpen: closeNormally,
          },
        )
        .pipe(
          /*
           * This route only exists to initiate a normal close. Any error from
           * the server side of the close handshake is irrelevant to the test.
           */
          E.catch(() => {
            return E.void;
          }),
        );
    }),
  );

  return HttpServerResponse.empty();
});

const NormalCloseRoutes = HttpRouter.addAll([
  HttpRouter.route("GET", NORMAL_CLOSE_ROUTE, handleNormalCloseRequest),
]);

const NormalCloseServerTest = HttpRouter.serve(NormalCloseRoutes).pipe(
  Layer.provideMerge(NodeHttpServer.layerTest),
);

describe("run event stream", () => {
  test("connects and receives the latest API state", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const webSocketBroadcaster = yield* WebSocketBroadcaster;
        const httpServer = yield* HttpServer.HttpServer;

        const websocketUrl = getWebSocketUrl(httpServer.address);

        yield* webSocketBroadcaster.publish(JSON.stringify(message));

        const clientEvents = yield* collectClientEvents(
          makeRunEventStreamForUrl(websocketUrl),
          3,
        );

        expect(clientEvents).toEqual([
          {
            state: API_CONNECTION_STATE.CONNECTING,
            type: "CONNECTION_STATE_CHANGED",
          },
          {
            state: API_CONNECTION_STATE.CONNECTED,
            type: "CONNECTION_STATE_CHANGED",
          },
          {
            message,
            type: "MESSAGE_RECEIVED",
          },
        ]);
      }).pipe(E.provide(ApiServerTest)),
    );

    await runTest(program);
  });

  test("receives API state published after connecting", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const webSocketBroadcaster = yield* WebSocketBroadcaster;
        const httpServer = yield* HttpServer.HttpServer;

        const websocketUrl = getWebSocketUrl(httpServer.address);
        const connected = yield* Deferred.make<void>();

        const clientFiber = yield* makeRunEventStreamForUrl(websocketUrl).pipe(
          Stream.tap((event) => {
            if (
              event.type === "CONNECTION_STATE_CHANGED" &&
              event.state === API_CONNECTION_STATE.CONNECTED
            ) {
              return Deferred.succeed(connected, undefined);
            }

            return E.void;
          }),
          Stream.take(3),
          Stream.runCollect,
          E.map((events) => {
            return Array.from(events);
          }),
          E.timeout(TEST_TIMEOUT),
          E.forkScoped,
        );

        yield* Deferred.await(connected).pipe(E.timeout(TEST_TIMEOUT));

        yield* webSocketBroadcaster.publish(JSON.stringify(message));

        const clientEvents = yield* Fiber.join(clientFiber);

        expect(clientEvents).toEqual([
          {
            state: API_CONNECTION_STATE.CONNECTING,
            type: "CONNECTION_STATE_CHANGED",
          },
          {
            state: API_CONNECTION_STATE.CONNECTED,
            type: "CONNECTION_STATE_CHANGED",
          },
          {
            message,
            type: "MESSAGE_RECEIVED",
          },
        ]);
      }).pipe(E.provide(ApiServerTest)),
    );

    await runTest(program);
  });

  test("fails when the API sends an invalid message", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const webSocketBroadcaster = yield* WebSocketBroadcaster;
        const httpServer = yield* HttpServer.HttpServer;

        const websocketUrl = getWebSocketUrl(httpServer.address);

        yield* webSocketBroadcaster.publish(
          JSON.stringify({
            invalid: true,
          }),
        );

        const wasDecodeError = yield* makeRunEventStreamForUrl(
          websocketUrl,
        ).pipe(
          Stream.runDrain,
          E.as(false),
          E.catchTag(RUN_EVENT_MESSAGE_DECODE_ERROR, () => {
            return E.succeed(true);
          }),
          E.timeout(TEST_TIMEOUT),
        );

        expect(wasDecodeError).toBe(true);
      }).pipe(E.provide(ApiServerTest)),
    );

    await runTest(program);
  });

  test("retries after a WebSocket connection failure", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;

        const websocketUrl = getWebSocketUrl(httpServer.address);
        const invalidWebsocketUrl = websocketUrl.replace(
          ROUTES.dungeonRunEvents,
          "/invalid",
        );

        const clientEvents = yield* collectClientEvents(
          makeRunEventStreamForUrl(invalidWebsocketUrl, {
            reconnectDelay: TEST_RECONNECT_DELAY,
          }),
          4,
        );

        expect(clientEvents).toEqual([
          {
            state: API_CONNECTION_STATE.CONNECTING,
            type: "CONNECTION_STATE_CHANGED",
          },
          {
            state: API_CONNECTION_STATE.DISCONNECTED,
            type: "CONNECTION_STATE_CHANGED",
          },
          {
            state: API_CONNECTION_STATE.CONNECTING,
            type: "CONNECTION_STATE_CHANGED",
          },
          {
            state: API_CONNECTION_STATE.DISCONNECTED,
            type: "CONNECTION_STATE_CHANGED",
          },
        ]);
      }).pipe(E.provide(ApiServerTest)),
    );

    await runTest(program);
  });

  test("reconnects after a normal WebSocket close", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;

        const websocketUrl = getWebSocketUrl(httpServer.address).replace(
          ROUTES.dungeonRunEvents,
          NORMAL_CLOSE_ROUTE,
        );

        const clientEvents = yield* collectClientEvents(
          makeRunEventStreamForUrl(websocketUrl, {
            reconnectDelay: TEST_RECONNECT_DELAY,
          }),
          6,
        );

        expect(clientEvents).toEqual([
          {
            state: API_CONNECTION_STATE.CONNECTING,
            type: "CONNECTION_STATE_CHANGED",
          },
          {
            state: API_CONNECTION_STATE.CONNECTED,
            type: "CONNECTION_STATE_CHANGED",
          },
          {
            state: API_CONNECTION_STATE.DISCONNECTED,
            type: "CONNECTION_STATE_CHANGED",
          },
          {
            state: API_CONNECTION_STATE.CONNECTING,
            type: "CONNECTION_STATE_CHANGED",
          },
          {
            state: API_CONNECTION_STATE.CONNECTED,
            type: "CONNECTION_STATE_CHANGED",
          },
          {
            state: API_CONNECTION_STATE.DISCONNECTED,
            type: "CONNECTION_STATE_CHANGED",
          },
        ]);
      }).pipe(E.provide(NormalCloseServerTest)),
    );

    await runTest(program);
  });
});

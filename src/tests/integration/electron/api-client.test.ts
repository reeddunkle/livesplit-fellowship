import { NodeHttpServer } from "@effect/platform-node";
import * as Deferred from "effect/Deferred";
import * as E from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as HttpServer from "effect/unstable/http/HttpServer";
import { describe, expect, test } from "vitest";

import { ApiServer } from "@/api/api-server.ts";
import { type RunApiMessage } from "@/api/validation/run-api-message-schema.ts";
import {
  API_CONNECTION_STATE,
  makeApiEventStreamForUrl,
} from "@/electron/renderer/api-client.ts";
import {
  PushEventServer,
  PushEventServerLive,
} from "@/services/api/push-event-server-service.ts";
import { runTest } from "@/tests/common/run-test.ts";

const TEST_TIMEOUT = "1 second";

const ApiServerTest = ApiServer.pipe(
  Layer.provideMerge(PushEventServerLive),
  Layer.provideMerge(NodeHttpServer.layerTest),
);

const message = {
  state: {
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
    run: {
      startedAtMilliseconds: 1_000,
    },
  },
  version: 1,
} satisfies RunApiMessage;

function getWebSocketUrl(address: HttpServer.Address): string {
  if (address._tag === "UnixAddress") {
    throw new Error("WebSocket test does not support Unix socket addresses.");
  }

  const hostname =
    address.hostname === "0.0.0.0" ? "127.0.0.1" : address.hostname;

  return `ws://${hostname}:${address.port}/events`;
}

describe("Electron API client", () => {
  test("connects and receives the latest API state", async () => {
    const program = E.scoped(
      E.gen(function* () {
        const pushEventServer = yield* PushEventServer;
        const httpServer = yield* HttpServer.HttpServer;

        const websocketUrl = getWebSocketUrl(httpServer.address);

        /*
         * Publish before the client connects. This verifies that the backend
         * retains the latest state and sends it to new clients on connection.
         */
        yield* pushEventServer.publish(JSON.stringify(message));

        const clientEvents = yield* makeApiEventStreamForUrl(websocketUrl).pipe(
          Stream.take(3),
          Stream.runCollect,
          E.map((events) => {
            return Array.from(events);
          }),
          E.timeout(TEST_TIMEOUT),
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
        const pushEventServer = yield* PushEventServer;
        const httpServer = yield* HttpServer.HttpServer;

        const websocketUrl = getWebSocketUrl(httpServer.address);
        const connected = yield* Deferred.make<void>();

        const clientFiber = yield* makeApiEventStreamForUrl(websocketUrl).pipe(
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

        yield* pushEventServer.publish(JSON.stringify(message));

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
        const pushEventServer = yield* PushEventServer;
        const httpServer = yield* HttpServer.HttpServer;

        const websocketUrl = getWebSocketUrl(httpServer.address);

        yield* pushEventServer.publish(
          JSON.stringify({
            invalid: true,
          }),
        );

        const wasDecodeError = yield* makeApiEventStreamForUrl(
          websocketUrl,
        ).pipe(
          Stream.runDrain,
          E.as(false),
          E.catchTag("ApiClientMessageDecodeError", () => {
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
        const invalidWebsocketUrl = websocketUrl.replace("/events", "/invalid");

        const clientEvents = yield* makeApiEventStreamForUrl(
          invalidWebsocketUrl,
          {
            reconnectDelay: "10 millis",
          },
        ).pipe(
          Stream.take(4),
          Stream.runCollect,
          E.map((events) => {
            return Array.from(events);
          }),
          E.timeout(TEST_TIMEOUT),
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
});

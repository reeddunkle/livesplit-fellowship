import { NodeHttpServer } from "@effect/platform-node";
import * as Deferred from "effect/Deferred";
import * as E from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import * as HttpServer from "effect/unstable/http/HttpServer";
import { describe, expect, test } from "vitest";

import { ApiServer } from "@/api/api-server.ts";
import { type RunApiMessage } from "@/api/validation/run-api-message-schema.ts";
import {
  API_CONNECTION_STATE,
  createConfigurationForUrl,
  deleteConfigurationForUrl,
  getConfigurationForUrl,
  getConfigurationsForUrl,
  makeApiEventStreamForUrl,
} from "@/electron/renderer/api-client.ts";
import { ConfigurationStoreError } from "@/errors/configuration-store-error.ts";
import { type ConfigurationApiConfiguration } from "@/services/api/configuration/configuration-api-schema.ts";
import { type ConfigurationApiService } from "@/services/api/configuration/configuration-api-service.ts";
import {
  PushEventServer,
  PushEventServerLive,
} from "@/services/api/push-event-server-service.ts";
import { FELLOWSHIP_DUNGEON } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { makeConfigurationApiServiceTest } from "@/tests/common/configuration-api-service-test.ts";
import { runTest } from "@/tests/common/run-test.ts";

const TEST_TIMEOUT = "1 second";

const CONFIGURATION_ID = "0198d56c-1234-7abc-8def-1234567890ab";
const UNKNOWN_CONFIGURATION_ID = "0198d56c-5678-7abc-8def-1234567890ab";

const configuration = {
  dungeonId: "3",
  dungeonName: "Everdawn Grove",
  id: CONFIGURATION_ID,
  milestones: [
    {
      label: "Desecrator 1 Killed",
      requirements: [
        {
          requiredCount: 1,
          startOccurrence: 1,
          targetId: "42",
          type: "UNIT_DEATH",
        },
      ],
    },
  ],
} satisfies ConfigurationApiConfiguration;

const createConfigurationRequest = {
  configuration: {
    dungeonKey: "EVERDAWN_GROVE",
    milestones: [
      {
        label: "Desecrator 1 Killed",
        requirements: [
          {
            requiredCount: 1,
            startOccurrence: 1,
            type: "UNIT_DEATH",
            unitTypeId: "42",
          },
        ],
      },
    ],
  },
} as const;

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

function makeApiServerTest(
  configurationApiServiceTest: Layer.Layer<ConfigurationApiService>,
) {
  return ApiServer.pipe(
    Layer.provideMerge(PushEventServerLive),
    Layer.provideMerge(configurationApiServiceTest),
    Layer.provideMerge(NodeHttpServer.layerTest),
  );
}

function getHttpUrl(address: HttpServer.Address): string {
  if (address._tag === "UnixAddress") {
    throw new Error("HTTP test does not support Unix socket addresses.");
  }

  const hostname =
    address.hostname === "0.0.0.0" ? "127.0.0.1" : address.hostname;

  return `http://${hostname}:${address.port}`;
}

function getWebSocketUrl(address: HttpServer.Address): string {
  return `${getHttpUrl(address).replace("http://", "ws://")}/events`;
}

describe("Electron API client", () => {
  test("gets all configurations", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest({
      getAll: () => {
        return E.succeed([configuration]);
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const configurations = yield* getConfigurationsForUrl(baseUrl);

        expect(configurations).toEqual([configuration]);
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("gets a configuration", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest({
      getById: ({ id }) => {
        if (id === CONFIGURATION_ID) {
          return E.succeed(Option.some(configuration));
        }

        return E.succeed(Option.none());
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const result = yield* getConfigurationForUrl(baseUrl, CONFIGURATION_ID);

        expect(result).toEqual(configuration);
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("returns NotFound when a configuration does not exist", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest();

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const wasNotFound = yield* getConfigurationForUrl(
          baseUrl,
          UNKNOWN_CONFIGURATION_ID,
        ).pipe(
          E.as(false),
          E.catchTag("NotFound", () => {
            return E.succeed(true);
          }),
        );

        expect(wasNotFound).toBe(true);
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("creates a configuration", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest({
      create: ({ configuration: createdConfiguration }) => {
        expect(createdConfiguration).toEqual({
          dungeon: FELLOWSHIP_DUNGEON.EVERDAWN_GROVE,
          milestones: createConfigurationRequest.configuration.milestones,
        });

        return E.succeed(configuration);
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const result = yield* createConfigurationForUrl(
          baseUrl,
          createConfigurationRequest,
        );

        expect(result).toEqual(configuration);
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("returns Conflict when creating a duplicate configuration", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest({
      create: () => {
        return E.fail(
          new ConfigurationStoreError({
            details: {
              _tag: "DuplicateConfiguration",
              fingerprint: "duplicate-fingerprint",
            },
          }),
        );
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const wasConflict = yield* createConfigurationForUrl(
          baseUrl,
          createConfigurationRequest,
        ).pipe(
          E.as(false),
          E.catchTag("Conflict", () => {
            return E.succeed(true);
          }),
        );

        expect(wasConflict).toBe(true);
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("deletes a configuration", async () => {
    let deletedConfigurationId: string | undefined;

    const configurationApiServiceTest = makeConfigurationApiServiceTest({
      delete: ({ id }) => {
        deletedConfigurationId = id;

        return E.void;
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        yield* deleteConfigurationForUrl(baseUrl, CONFIGURATION_ID);

        expect(deletedConfigurationId).toBe(CONFIGURATION_ID);
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("connects and receives the latest API state", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest();

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
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("receives API state published after connecting", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest();

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
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("fails when the API sends an invalid message", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest();

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
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("retries after a WebSocket connection failure", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest();

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
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });
});

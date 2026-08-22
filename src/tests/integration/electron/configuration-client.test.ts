import { NodeHttpServer } from "@effect/platform-node";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as HttpServer from "effect/unstable/http/HttpServer";
import { describe, expect, test } from "vitest";

import { ApiServer } from "@/api/api-server.ts";
import {
  createConfigurationForUrl,
  deleteConfigurationForUrl,
  getConfigurationForUrl,
  getConfigurationsForUrl,
} from "@/electron/renderer/api/configuration-client.ts";
import { ConfigurationStoreError } from "@/errors/configuration-store-error.ts";
import { type ConfigurationApiConfiguration } from "@/services/api/configuration/configuration-api-schema.ts";
import { type ConfigurationApiService } from "@/services/api/configuration/configuration-api-service.ts";
import { WebSocketBroadcasterLive } from "@/services/api/websocket-broadcaster-service.ts";
import { FELLOWSHIP_DUNGEON } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { makeConfigurationApiServiceTest } from "@/tests/common/configuration-api-service-test.ts";
import { runTest } from "@/tests/common/run-test.ts";

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

function makeApiServerTest(
  configurationApiServiceTest: Layer.Layer<ConfigurationApiService>,
) {
  return ApiServer.pipe(
    Layer.provideMerge(WebSocketBroadcasterLive),
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

describe("configuration client", () => {
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
});

import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";
import { describe, expect, test } from "vitest";

import { AppHttpApi } from "@/api/http/http-api.ts";
import { ConfigurationDAOError } from "@/errors/configuration-dao-error.ts";
import {
  type ConfigurationApiConfiguration,
  ConfigurationApiConfigurationListSchema,
  ConfigurationApiConfigurationSchema,
} from "@/services/api/configuration/configuration-api-schema.ts";
import { type ConfigurationApiService } from "@/services/api/configuration/configuration-api-service.ts";
import { makeApiServerTestLayer } from "@/tests/common/layers/api-server-test-layer.ts";
import { AbilityApiServiceMock } from "@/tests/common/mocks/ability-api-service-mock.ts";
import { makeConfigurationApiServiceMock } from "@/tests/common/mocks/configuration-api-service-mock.ts";
import { DungeonApiServiceMock } from "@/tests/common/mocks/dungeon-api-service-mock.ts";
import { EncounterApiServiceMock } from "@/tests/common/mocks/encounter-api-service-mock.ts";
import { TrackerApiServiceMock } from "@/tests/common/mocks/tracker-api-service-mock.ts";
import { UnitApiServiceMock } from "@/tests/common/mocks/unit-api-service-mock.ts";
import { runTest } from "@/tests/common/run-test.ts";
import { parseJson } from "@/util/parse-json.ts";
import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id.ts";

const CONFIGURATION_ID = Schema.decodeUnknownSync(ConfigurationIdSchema)(
  "0198d56c-1234-7abc-8def-1234567890ab",
);

const UNKNOWN_CONFIGURATION_ID = Schema.decodeUnknownSync(
  ConfigurationIdSchema,
)("0198f5d8-0000-7000-8000-000000000000");

const DUNGEON_ID = "11";
const DUNGEON_LEVEL = 63;

const configuration = {
  dungeonId: DUNGEON_ID,
  dungeonLevel: DUNGEON_LEVEL,
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
    dungeonId: DUNGEON_ID,
    dungeonLevel: DUNGEON_LEVEL,
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

function makeConfigurationApiServerTestLayer(
  configurationApiServiceLayer: Layer.Layer<ConfigurationApiService>,
) {
  const apiServicesLayer = Layer.mergeAll(
    configurationApiServiceLayer,
    AbilityApiServiceMock,
    DungeonApiServiceMock,
    EncounterApiServiceMock,
    TrackerApiServiceMock,
    UnitApiServiceMock,
  );

  return makeApiServerTestLayer(apiServicesLayer);
}

function parseResponseJson(response: Response): E.Effect<unknown, Error> {
  return E.gen(function* () {
    const contents = yield* E.tryPromise({
      catch: (cause) => {
        return cause instanceof Error
          ? cause
          : new Error("Failed to read HTTP response.");
      },
      try: () => response.text(),
    });

    return yield* parseJson({
      contents,
      onError: (cause) => {
        return cause instanceof Error
          ? cause
          : new Error("Failed to parse HTTP response.");
      },
    });
  });
}

function getHttpUrl(address: HttpServer.Address): string {
  if (address._tag === "UnixAddress") {
    throw new Error("HTTP test does not support Unix socket addresses.");
  }

  const hostname =
    address.hostname === "0.0.0.0" ? "127.0.0.1" : address.hostname;

  return `http://${hostname}:${address.port}`;
}

function request(
  url: string,
  options?: RequestInit,
): E.Effect<Response, Error> {
  return E.tryPromise({
    catch: (cause) => {
      return cause instanceof Error ? cause : new Error("HTTP request failed.");
    },
    try: () => {
      return fetch(url, options);
    },
  });
}

describe("configuration routes", () => {
  test("GET /configurations returns all configurations", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      getAll: () => {
        return E.succeed([configuration]);
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const urls = HttpApiClient.urlBuilder(AppHttpApi, {
          baseUrl,
        });

        const response = yield* request(
          urls.configurations.getConfigurations(),
        );

        const json = yield* parseResponseJson(response);

        const body = yield* Schema.decodeUnknownEffect(
          ConfigurationApiConfigurationListSchema,
        )(json);

        expect(response.status).toBe(200);
        expect(body).toEqual([configuration]);
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("GET /configurations/:id returns a configuration", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock({
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

        const urls = HttpApiClient.urlBuilder(AppHttpApi, {
          baseUrl,
        });

        const response = yield* request(
          urls.configurations.getConfiguration({
            params: {
              id: CONFIGURATION_ID,
            },
          }),
        );

        const json = yield* parseResponseJson(response);

        const body = yield* Schema.decodeUnknownEffect(
          ConfigurationApiConfigurationSchema,
        )(json);

        expect(response.status).toBe(200);
        expect(body).toEqual(configuration);
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("GET /configurations/:id returns 404 when the configuration does not exist", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock();

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const urls = HttpApiClient.urlBuilder(AppHttpApi, {
          baseUrl,
        });

        const response = yield* request(
          urls.configurations.getConfiguration({
            params: {
              id: UNKNOWN_CONFIGURATION_ID,
            },
          }),
        );

        expect(response.status).toBe(404);
        expect(yield* E.promise(() => response.text())).toBe("");
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("POST /configurations creates a configuration", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      create: ({ configuration: createdConfiguration }) => {
        expect(createdConfiguration).toEqual({
          dungeonId: createConfigurationRequest.configuration.dungeonId,
          dungeonLevel: createConfigurationRequest.configuration.dungeonLevel,
          milestones: createConfigurationRequest.configuration.milestones,
        });

        return E.succeed(configuration);
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const urls = HttpApiClient.urlBuilder(AppHttpApi, {
          baseUrl,
        });

        const response = yield* request(
          urls.configurations.createConfiguration(),
          {
            body: JSON.stringify(createConfigurationRequest),
            headers: {
              "content-type": "application/json",
            },
            method: "POST",
          },
        );

        const json = yield* parseResponseJson(response);

        const body = yield* Schema.decodeUnknownEffect(
          ConfigurationApiConfigurationSchema,
        )(json);

        expect(response.status).toBe(201);
        expect(body).toEqual(configuration);
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("POST /configurations returns 400 for an invalid request body", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock();

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const urls = HttpApiClient.urlBuilder(AppHttpApi, {
          baseUrl,
        });

        const response = yield* request(
          urls.configurations.createConfiguration(),
          {
            body: JSON.stringify({
              invalid: true,
            }),
            headers: {
              "content-type": "application/json",
            },
            method: "POST",
          },
        );

        expect(response.status).toBe(400);
        expect(yield* E.promise(() => response.text())).toBe("");
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("POST /configurations returns 409 for a duplicate configuration", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      create: () => {
        return E.fail(
          new ConfigurationDAOError({
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

        const urls = HttpApiClient.urlBuilder(AppHttpApi, {
          baseUrl,
        });

        const response = yield* request(
          urls.configurations.createConfiguration(),
          {
            body: JSON.stringify(createConfigurationRequest),
            headers: {
              "content-type": "application/json",
            },
            method: "POST",
          },
        );

        expect(response.status).toBe(409);
        expect(yield* E.promise(() => response.text())).toBe("");
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("DELETE /configurations/:id deletes a configuration", async () => {
    let deletedConfigurationId: string | undefined;

    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      delete: ({ id }) => {
        deletedConfigurationId = id;

        return E.void;
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const urls = HttpApiClient.urlBuilder(AppHttpApi, {
          baseUrl,
        });

        const response = yield* request(
          urls.configurations.deleteConfiguration({
            params: {
              id: CONFIGURATION_ID,
            },
          }),
          {
            method: "DELETE",
          },
        );

        expect(response.status).toBe(204);
        expect(deletedConfigurationId).toBe(CONFIGURATION_ID);
        expect(yield* E.promise(() => response.text())).toBe("");
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("returns 400 for a malformed configuration id", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock();

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const response = yield* request(`${baseUrl}/configurations/not-a-uuid`);

        expect(response.status).toBe(400);
        expect(yield* E.promise(() => response.text())).toBe("");
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("returns 404 for an unsupported method", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock();

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const urls = HttpApiClient.urlBuilder(AppHttpApi, {
          baseUrl,
        });

        const response = yield* request(
          urls.configurations.getConfigurations(),
          {
            method: "PUT",
          },
        );

        expect(response.status).toBe(404);
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("returns 500 when loading configurations fails", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      getAll: () => {
        return E.fail(
          new ConfigurationDAOError({
            details: {
              _tag: "Unexpected",
              cause: new Error("Database failure."),
            },
          }),
        );
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const urls = HttpApiClient.urlBuilder(AppHttpApi, {
          baseUrl,
        });

        const response = yield* request(
          urls.configurations.getConfigurations(),
        );

        expect(response.status).toBe(500);
        expect(yield* E.promise(() => response.text())).toBe("");
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });
});

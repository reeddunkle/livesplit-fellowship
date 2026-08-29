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
import {
  TEST_CONFIGURATION,
  TEST_CONFIGURATION_FINGERPRINT,
  TEST_CONFIGURATION_ID,
  TEST_CONFIGURATION_LABEL,
  TEST_SAVE_CONFIGURATION_REQUEST,
  TEST_UNKNOWN_CONFIGURATION_ID,
  TEST_UPDATED_CONFIGURATION_LABEL,
} from "@/tests/common/fixtures/configuration-fixtures.ts";
import { makeApiServerTestLayer } from "@/tests/common/layers/api-server-test-layer.ts";
import { AbilityApiServiceMock } from "@/tests/common/mocks/ability-api-service-mock.ts";
import { makeConfigurationApiServiceMock } from "@/tests/common/mocks/configuration-api-service-mock.ts";
import { DungeonApiServiceMock } from "@/tests/common/mocks/dungeon-api-service-mock.ts";
import { EncounterApiServiceMock } from "@/tests/common/mocks/encounter-api-service-mock.ts";
import { TrackerApiServiceMock } from "@/tests/common/mocks/tracker-api-service-mock.ts";
import { UnitApiServiceMock } from "@/tests/common/mocks/unit-api-service-mock.ts";
import { runTest } from "@/tests/common/run-test.ts";
import { parseJson } from "@/util/parse-json.ts";

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
        return E.succeed([TEST_CONFIGURATION]);
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
        expect(body).toEqual([TEST_CONFIGURATION]);
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
        if (id === TEST_CONFIGURATION_ID) {
          return E.succeed(Option.some(TEST_CONFIGURATION));
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
              id: TEST_CONFIGURATION_ID,
            },
          }),
        );

        const json = yield* parseResponseJson(response);

        const body = yield* Schema.decodeUnknownEffect(
          ConfigurationApiConfigurationSchema,
        )(json);

        expect(response.status).toBe(200);
        expect(body).toEqual(TEST_CONFIGURATION);
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
              id: TEST_UNKNOWN_CONFIGURATION_ID,
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

  test("POST /configurations saves a configuration", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      save: ({ configuration: savedConfiguration, label }) => {
        expect(savedConfiguration).toEqual({
          dungeonId: TEST_SAVE_CONFIGURATION_REQUEST.configuration.dungeonId,
          dungeonLevel:
            TEST_SAVE_CONFIGURATION_REQUEST.configuration.dungeonLevel,
          milestones: TEST_SAVE_CONFIGURATION_REQUEST.configuration.milestones,
        });

        expect(label).toBe(TEST_CONFIGURATION_LABEL);

        return E.succeed(TEST_CONFIGURATION);
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
          urls.configurations.saveConfiguration(),
          {
            body: JSON.stringify(TEST_SAVE_CONFIGURATION_REQUEST),
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
        expect(body).toEqual(TEST_CONFIGURATION);
        expect(body.fingerprint).toBe(TEST_CONFIGURATION_FINGERPRINT);
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("POST /configurations updates a semantically duplicate configuration", async () => {
    const updatedConfiguration = {
      ...TEST_CONFIGURATION,
      label: TEST_UPDATED_CONFIGURATION_LABEL,
    } satisfies ConfigurationApiConfiguration;

    const updatedRequest = {
      ...TEST_SAVE_CONFIGURATION_REQUEST,
      label: TEST_UPDATED_CONFIGURATION_LABEL,
    } as const;

    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      save: ({ configuration: savedConfiguration, label }) => {
        expect(savedConfiguration).toEqual(updatedRequest.configuration);
        expect(label).toBe(TEST_UPDATED_CONFIGURATION_LABEL);

        return E.succeed(updatedConfiguration);
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
          urls.configurations.saveConfiguration(),
          {
            body: JSON.stringify(updatedRequest),
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
        expect(body.id).toBe(TEST_CONFIGURATION_ID);
        expect(body.fingerprint).toBe(TEST_CONFIGURATION_FINGERPRINT);
        expect(body.label).toBe(TEST_UPDATED_CONFIGURATION_LABEL);
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
          urls.configurations.saveConfiguration(),
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
              id: TEST_CONFIGURATION_ID,
            },
          }),
          {
            method: "DELETE",
          },
        );

        expect(response.status).toBe(204);
        expect(deletedConfigurationId).toBe(TEST_CONFIGURATION_ID);
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

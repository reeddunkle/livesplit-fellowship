import * as E from "effect/Effect";
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
import {
  MOCK_CONFIGURATION,
  MOCK_CONFIGURATION_FINGERPRINT,
  MOCK_CONFIGURATION_ID,
  MOCK_CONFIGURATION_LABEL,
  MOCK_SAVE_CONFIGURATION_REQUEST,
  MOCK_UNKNOWN_CONFIGURATION_ID,
  MOCK_UPDATED_CONFIGURATION_LABEL,
} from "@/tests/common/fixtures/configuration-fixtures.ts";
import { makeApiServerTestLayerWith } from "@/tests/common/layers/api-server-test-layer.ts";
import { makeConfigurationApiServiceMock } from "@/tests/common/mocks/configuration-api-service-mock.ts";
import { runTest } from "@/tests/common/run-test.ts";
import { parseJson } from "@/util/parse-json.ts";

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
        return E.succeed([MOCK_CONFIGURATION]);
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
        expect(body).toEqual([MOCK_CONFIGURATION]);
      }).pipe(
        E.provide(makeApiServerTestLayerWith(configurationApiServiceTest)),
      ),
    );

    await runTest(program);
  });

  test("GET /configurations/:id returns a configuration", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      getById: ({ id }) => {
        if (id === MOCK_CONFIGURATION_ID) {
          return E.succeed(Option.some(MOCK_CONFIGURATION));
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
              id: MOCK_CONFIGURATION_ID,
            },
          }),
        );

        const json = yield* parseResponseJson(response);

        const body = yield* Schema.decodeUnknownEffect(
          ConfigurationApiConfigurationSchema,
        )(json);

        expect(response.status).toBe(200);
        expect(body).toEqual(MOCK_CONFIGURATION);
      }).pipe(
        E.provide(makeApiServerTestLayerWith(configurationApiServiceTest)),
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
              id: MOCK_UNKNOWN_CONFIGURATION_ID,
            },
          }),
        );

        expect(response.status).toBe(404);
        expect(yield* E.promise(() => response.text())).toBe("");
      }).pipe(
        E.provide(makeApiServerTestLayerWith(configurationApiServiceTest)),
      ),
    );

    await runTest(program);
  });

  test("POST /configurations saves a configuration", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      save: ({ configuration: savedConfiguration, label }) => {
        expect(savedConfiguration).toEqual({
          dungeonId: MOCK_SAVE_CONFIGURATION_REQUEST.configuration.dungeonId,
          dungeonLevel:
            MOCK_SAVE_CONFIGURATION_REQUEST.configuration.dungeonLevel,
          milestones: MOCK_SAVE_CONFIGURATION_REQUEST.configuration.milestones,
        });

        expect(label).toBe(MOCK_CONFIGURATION_LABEL);

        return E.succeed(MOCK_CONFIGURATION);
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
            body: JSON.stringify(MOCK_SAVE_CONFIGURATION_REQUEST),
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
        expect(body).toEqual(MOCK_CONFIGURATION);
        expect(body.fingerprint).toBe(MOCK_CONFIGURATION_FINGERPRINT);
      }).pipe(
        E.provide(makeApiServerTestLayerWith(configurationApiServiceTest)),
      ),
    );

    await runTest(program);
  });

  test("POST /configurations updates a semantically duplicate configuration", async () => {
    const updatedConfiguration = {
      ...MOCK_CONFIGURATION,
      label: MOCK_UPDATED_CONFIGURATION_LABEL,
    } satisfies ConfigurationApiConfiguration;

    const updatedRequest = {
      ...MOCK_SAVE_CONFIGURATION_REQUEST,
      label: MOCK_UPDATED_CONFIGURATION_LABEL,
    } as const;

    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      save: ({ configuration: savedConfiguration, label }) => {
        expect(savedConfiguration).toEqual(updatedRequest.configuration);
        expect(label).toBe(MOCK_UPDATED_CONFIGURATION_LABEL);

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
        expect(body.id).toBe(MOCK_CONFIGURATION_ID);
        expect(body.fingerprint).toBe(MOCK_CONFIGURATION_FINGERPRINT);
        expect(body.label).toBe(MOCK_UPDATED_CONFIGURATION_LABEL);
      }).pipe(
        E.provide(makeApiServerTestLayerWith(configurationApiServiceTest)),
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
        E.provide(makeApiServerTestLayerWith(configurationApiServiceTest)),
      ),
    );

    await runTest(program);
  });

  test("PUT /configurations/:id updates a configuration", async () => {
    const updatedConfiguration = {
      ...MOCK_CONFIGURATION,
      label: MOCK_UPDATED_CONFIGURATION_LABEL,
    } satisfies ConfigurationApiConfiguration;

    const updatedRequest = {
      ...MOCK_SAVE_CONFIGURATION_REQUEST,
      label: MOCK_UPDATED_CONFIGURATION_LABEL,
    } as const;

    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      update: ({ configuration, id, label }) => {
        expect(id).toBe(MOCK_CONFIGURATION_ID);
        expect(configuration).toEqual(updatedRequest.configuration);
        expect(label).toBe(MOCK_UPDATED_CONFIGURATION_LABEL);

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
          urls.configurations.updateConfiguration({
            params: {
              id: MOCK_CONFIGURATION_ID,
            },
          }),
          {
            body: JSON.stringify(updatedRequest),
            headers: {
              "content-type": "application/json",
            },
            method: "PUT",
          },
        );

        const json = yield* parseResponseJson(response);

        const body = yield* Schema.decodeUnknownEffect(
          ConfigurationApiConfigurationSchema,
        )(json);

        expect(response.status).toBe(200);
        expect(body).toEqual(updatedConfiguration);
        expect(body.id).toBe(MOCK_CONFIGURATION_ID);
        expect(body.label).toBe(MOCK_UPDATED_CONFIGURATION_LABEL);
      }).pipe(
        E.provide(makeApiServerTestLayerWith(configurationApiServiceTest)),
      ),
    );

    await runTest(program);
  });

  test("PUT /configurations/:id returns 400 for an invalid request body", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock();

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const urls = HttpApiClient.urlBuilder(AppHttpApi, {
          baseUrl,
        });

        const response = yield* request(
          urls.configurations.updateConfiguration({
            params: {
              id: MOCK_CONFIGURATION_ID,
            },
          }),
          {
            body: JSON.stringify({
              invalid: true,
            }),
            headers: {
              "content-type": "application/json",
            },
            method: "PUT",
          },
        );

        expect(response.status).toBe(400);
        expect(yield* E.promise(() => response.text())).toBe("");
      }).pipe(
        E.provide(makeApiServerTestLayerWith(configurationApiServiceTest)),
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
              id: MOCK_CONFIGURATION_ID,
            },
          }),
          {
            method: "DELETE",
          },
        );

        expect(response.status).toBe(204);
        expect(deletedConfigurationId).toBe(MOCK_CONFIGURATION_ID);
        expect(yield* E.promise(() => response.text())).toBe("");
      }).pipe(
        E.provide(makeApiServerTestLayerWith(configurationApiServiceTest)),
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
        E.provide(makeApiServerTestLayerWith(configurationApiServiceTest)),
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
            method: "PATCH",
          },
        );

        expect(response.status).toBe(404);
      }).pipe(
        E.provide(makeApiServerTestLayerWith(configurationApiServiceTest)),
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
        E.provide(makeApiServerTestLayerWith(configurationApiServiceTest)),
      ),
    );

    await runTest(program);
  });
});

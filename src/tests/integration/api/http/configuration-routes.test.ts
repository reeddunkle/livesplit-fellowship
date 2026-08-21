import { NodeHttpServer } from "@effect/platform-node";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as HttpServer from "effect/unstable/http/HttpServer";
import { describe, expect, test } from "vitest";

import { ApiServer } from "@/api/api-server.ts";
import { getConfigurationRoute, ROUTES } from "@/api/constants/routes.ts";
import { ConfigurationStoreError } from "@/errors/configuration-store-error.ts";
import {
  type ConfigurationApiConfiguration,
  ConfigurationApiConfigurationListSchema,
  ConfigurationApiConfigurationSchema,
} from "@/services/api/configuration/configuration-api-schema.ts";
import { type ConfigurationApiService } from "@/services/api/configuration/configuration-api-service.ts";
import { PushEventServerLive } from "@/services/api/push-event-server-service.ts";
import { FELLOWSHIP_DUNGEON } from "@/services/fellowship/constants/fellowship-dungeon.ts";
import { makeConfigurationApiServiceTest } from "@/tests/common/configuration-api-service-test.ts";
import { runTest } from "@/tests/common/run-test.ts";
import { parseJson } from "@/util/parse-json.ts";

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
    const configurationApiServiceTest = makeConfigurationApiServiceTest({
      getAll: () => {
        return E.succeed([configuration]);
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const response = yield* request(`${baseUrl}${ROUTES.configurations}`);

        const json = yield* parseResponseJson(response);

        const body = yield* Schema.decodeUnknownEffect(
          ConfigurationApiConfigurationListSchema,
        )(json);

        expect(response.status).toBe(200);
        expect(body).toEqual([configuration]);
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("GET /configurations/:id returns a configuration", async () => {
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

        const response = yield* request(
          `${baseUrl}${getConfigurationRoute(CONFIGURATION_ID)}`,
        );

        const json = yield* parseResponseJson(response);

        const body = yield* Schema.decodeUnknownEffect(
          ConfigurationApiConfigurationSchema,
        )(json);

        expect(response.status).toBe(200);
        expect(body).toEqual(configuration);
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("GET /configurations/:id returns 404 when the configuration does not exist", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest();

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const response = yield* request(
          `${baseUrl}${getConfigurationRoute(UNKNOWN_CONFIGURATION_ID)}`,
        );

        expect(response.status).toBe(404);
        expect(yield* E.promise(() => response.text())).toBe("Not Found");
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("POST /configurations creates a configuration", async () => {
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

        const response = yield* request(`${baseUrl}${ROUTES.configurations}`, {
          body: JSON.stringify(createConfigurationRequest),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        });

        const json = yield* parseResponseJson(response);

        const body = yield* Schema.decodeUnknownEffect(
          ConfigurationApiConfigurationSchema,
        )(json);

        expect(response.status).toBe(201);
        expect(response.headers.get("location")).toBe(
          getConfigurationRoute(CONFIGURATION_ID),
        );
        expect(body).toEqual(configuration);
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("POST /configurations returns 400 for an invalid request body", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest();

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const response = yield* request(`${baseUrl}${ROUTES.configurations}`, {
          body: JSON.stringify({
            invalid: true,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        });

        expect(response.status).toBe(400);
        expect(yield* E.promise(() => response.text())).toBe("Bad Request");
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("POST /configurations returns 409 for a duplicate configuration", async () => {
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

        const response = yield* request(`${baseUrl}${ROUTES.configurations}`, {
          body: JSON.stringify(createConfigurationRequest),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        });

        expect(response.status).toBe(409);
        expect(yield* E.promise(() => response.text())).toBe("Conflict");
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("DELETE /configurations/:id deletes a configuration", async () => {
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

        const response = yield* request(
          `${baseUrl}${getConfigurationRoute(CONFIGURATION_ID)}`,
          {
            method: "DELETE",
          },
        );

        expect(response.status).toBe(204);
        expect(deletedConfigurationId).toBe(CONFIGURATION_ID);
        expect(yield* E.promise(() => response.text())).toBe("");
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("returns 404 for a malformed configuration id", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest();

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const response = yield* request(
          `${baseUrl}${getConfigurationRoute("not-a-uuid")}`,
        );

        expect(response.status).toBe(404);
        expect(yield* E.promise(() => response.text())).toBe("Not Found");
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("returns 404 for an unsupported method", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest();

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const response = yield* request(`${baseUrl}${ROUTES.configurations}`, {
          method: "PUT",
        });

        expect(response.status).toBe(404);
        expect(yield* E.promise(() => response.text())).toBe("Not Found");
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });

  test("returns 500 when loading configurations fails", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceTest({
      getAll: () => {
        return E.fail(
          new ConfigurationStoreError({
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

        const response = yield* request(`${baseUrl}${ROUTES.configurations}`);

        expect(response.status).toBe(500);
        expect(yield* E.promise(() => response.text())).toBe(
          "Internal Server Error",
        );
      }).pipe(E.provide(makeApiServerTest(configurationApiServiceTest))),
    );

    await runTest(program);
  });
});

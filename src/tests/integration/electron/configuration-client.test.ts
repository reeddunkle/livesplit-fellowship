import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as HttpServer from "effect/unstable/http/HttpServer";
import { describe, expect, test } from "vitest";

import {
  deleteConfigurationBase,
  getConfigurationBase,
  getConfigurationsBase,
  saveConfigurationBase,
  updateConfigurationBase,
} from "@/electron/renderer/api/configuration-client.ts";
import { type ConfigurationApiConfiguration } from "@/services/api/configuration/configuration-api-schema.ts";
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

function makeConfigurationApiServerTestLayer(
  configurationApiServiceLayer: Layer.Layer<ConfigurationApiService>,
) {
  const apiServicesLayer = Layer.mergeAll(
    AbilityApiServiceMock,
    configurationApiServiceLayer,
    DungeonApiServiceMock,
    EncounterApiServiceMock,
    TrackerApiServiceMock,
    UnitApiServiceMock,
  );

  return makeApiServerTestLayer(apiServicesLayer);
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
    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      getAll: () => {
        return E.succeed([TEST_CONFIGURATION]);
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const getConfigurations = getConfigurationsBase(baseUrl);

        const configurations = yield* getConfigurations();

        expect(configurations).toEqual([TEST_CONFIGURATION]);
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("gets a configuration", async () => {
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

        const getConfiguration = getConfigurationBase(baseUrl);

        const result = yield* getConfiguration({
          id: TEST_CONFIGURATION_ID,
        });

        expect(result).toEqual(TEST_CONFIGURATION);
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("returns NotFound when a configuration does not exist", async () => {
    const configurationApiServiceTest = makeConfigurationApiServiceMock();

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const getConfiguration = getConfigurationBase(baseUrl);

        const result = yield* getConfiguration({
          id: TEST_UNKNOWN_CONFIGURATION_ID,
        }).pipe(E.result);

        expect(Result.isFailure(result)).toBe(true);

        if (Result.isFailure(result)) {
          expect(result.failure._tag).toBe("NotFound");
        }
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("saves a configuration", async () => {
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

        const saveConfiguration = saveConfigurationBase(baseUrl);

        const result = yield* saveConfiguration({
          request: TEST_SAVE_CONFIGURATION_REQUEST,
        });

        expect(result).toEqual(TEST_CONFIGURATION);
        expect(result.fingerprint).toBe(TEST_CONFIGURATION_FINGERPRINT);
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("saves a semantically duplicate configuration as an update", async () => {
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

        const saveConfiguration = saveConfigurationBase(baseUrl);

        const result = yield* saveConfiguration({
          request: updatedRequest,
        });

        expect(result.id).toBe(TEST_CONFIGURATION_ID);
        expect(result.fingerprint).toBe(TEST_CONFIGURATION_FINGERPRINT);
        expect(result.label).toBe(TEST_UPDATED_CONFIGURATION_LABEL);
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("updates a configuration", async () => {
    const updatedConfiguration = {
      ...TEST_CONFIGURATION,
      label: TEST_UPDATED_CONFIGURATION_LABEL,
    } satisfies ConfigurationApiConfiguration;

    const updatedRequest = {
      ...TEST_SAVE_CONFIGURATION_REQUEST,
      label: TEST_UPDATED_CONFIGURATION_LABEL,
    } as const;

    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      update: ({ configuration: updatedValue, id, label }) => {
        expect(id).toBe(TEST_CONFIGURATION_ID);
        expect(updatedValue).toEqual(updatedRequest.configuration);
        expect(label).toBe(TEST_UPDATED_CONFIGURATION_LABEL);

        return E.succeed(updatedConfiguration);
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const updateConfiguration = updateConfigurationBase(baseUrl);

        const result = yield* updateConfiguration({
          id: TEST_CONFIGURATION_ID,
          request: updatedRequest,
        });

        expect(result).toEqual(updatedConfiguration);
        expect(result.id).toBe(TEST_CONFIGURATION_ID);
        expect(result.label).toBe(TEST_UPDATED_CONFIGURATION_LABEL);
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });

  test("deletes a configuration", async () => {
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

        const deleteConfiguration = deleteConfigurationBase(baseUrl);

        yield* deleteConfiguration({
          id: TEST_CONFIGURATION_ID,
        });

        expect(deletedConfigurationId).toBe(TEST_CONFIGURATION_ID);
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });
});

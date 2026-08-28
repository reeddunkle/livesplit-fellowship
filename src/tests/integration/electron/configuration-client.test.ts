import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as HttpServer from "effect/unstable/http/HttpServer";
import { describe, expect, test } from "vitest";

import {
  deleteConfigurationBase,
  getConfigurationBase,
  getConfigurationsBase,
  saveConfigurationBase,
} from "@/electron/renderer/api/configuration-client.ts";
import { type ConfigurationApiConfiguration } from "@/services/api/configuration/configuration-api-schema.ts";
import { type ConfigurationApiService } from "@/services/api/configuration/configuration-api-service.ts";
import { makeApiServerTestLayer } from "@/tests/common/layers/api-server-test-layer.ts";
import { AbilityApiServiceMock } from "@/tests/common/mocks/ability-api-service-mock.ts";
import { makeConfigurationApiServiceMock } from "@/tests/common/mocks/configuration-api-service-mock.ts";
import { DungeonApiServiceMock } from "@/tests/common/mocks/dungeon-api-service-mock.ts";
import { EncounterApiServiceMock } from "@/tests/common/mocks/encounter-api-service-mock.ts";
import { TrackerApiServiceMock } from "@/tests/common/mocks/tracker-api-service-mock.ts";
import { UnitApiServiceMock } from "@/tests/common/mocks/unit-api-service-mock.ts";
import { runTest } from "@/tests/common/run-test.ts";
import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id.ts";

const CONFIGURATION_ID = Schema.decodeUnknownSync(ConfigurationIdSchema)(
  "0198d56c-1234-7abc-8def-1234567890ab",
);

const UNKNOWN_CONFIGURATION_ID = Schema.decodeUnknownSync(
  ConfigurationIdSchema,
)("0198d56c-5678-7abc-8def-1234567890ab");

const CONFIGURATION_LABEL = "Everdawn Grove Route";
const UPDATED_CONFIGURATION_LABEL = "Updated Everdawn Grove Route";
const DUNGEON_ID = "11";
const DUNGEON_LEVEL = 63;

const configuration = {
  dungeonId: DUNGEON_ID,
  dungeonLevel: DUNGEON_LEVEL,
  id: CONFIGURATION_ID,
  label: CONFIGURATION_LABEL,
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

const saveConfigurationRequest = {
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
  label: CONFIGURATION_LABEL,
} as const;

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
        return E.succeed([configuration]);
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const getConfigurations = getConfigurationsBase(baseUrl);

        const configurations = yield* getConfigurations();

        expect(configurations).toEqual([configuration]);
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

        const getConfiguration = getConfigurationBase(baseUrl);

        const result = yield* getConfiguration({
          id: CONFIGURATION_ID,
        });

        expect(result).toEqual(configuration);
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
          id: UNKNOWN_CONFIGURATION_ID,
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
          dungeonId: saveConfigurationRequest.configuration.dungeonId,
          dungeonLevel: saveConfigurationRequest.configuration.dungeonLevel,
          milestones: saveConfigurationRequest.configuration.milestones,
        });

        expect(label).toBe(CONFIGURATION_LABEL);

        return E.succeed(configuration);
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const saveConfiguration = saveConfigurationBase(baseUrl);

        const result = yield* saveConfiguration({
          request: saveConfigurationRequest,
        });

        expect(result).toEqual(configuration);
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
      ...configuration,
      label: UPDATED_CONFIGURATION_LABEL,
    } satisfies ConfigurationApiConfiguration;

    const updatedRequest = {
      ...saveConfigurationRequest,
      label: UPDATED_CONFIGURATION_LABEL,
    } as const;

    const configurationApiServiceTest = makeConfigurationApiServiceMock({
      save: ({ configuration: savedConfiguration, label }) => {
        expect(savedConfiguration).toEqual(updatedRequest.configuration);
        expect(label).toBe(UPDATED_CONFIGURATION_LABEL);

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

        expect(result.id).toBe(CONFIGURATION_ID);
        expect(result.label).toBe(UPDATED_CONFIGURATION_LABEL);
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
          id: CONFIGURATION_ID,
        });

        expect(deletedConfigurationId).toBe(CONFIGURATION_ID);
      }).pipe(
        E.provide(
          makeConfigurationApiServerTestLayer(configurationApiServiceTest),
        ),
      ),
    );

    await runTest(program);
  });
});

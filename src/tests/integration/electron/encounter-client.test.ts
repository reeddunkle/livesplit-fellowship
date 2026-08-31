import * as DateTime from "effect/DateTime";
import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as HttpServer from "effect/unstable/http/HttpServer";
import { describe, expect, test } from "vitest";

import {
  getEncounterBase,
  getEncountersBase,
} from "@/electron/renderer/api/encounter-client.ts";
import { type EncounterApiEncounter } from "@/services/api/encounter/encounter-api-schema.ts";
import { type EncounterApiService } from "@/services/api/encounter/encounter-api-service.ts";
import { makeApiServerTestLayer } from "@/tests/common/layers/api-server-test-layer.ts";
import { AbilityApiServiceMock } from "@/tests/common/mocks/ability-api-service-mock.ts";
import { ConfigurationApiServiceMock } from "@/tests/common/mocks/configuration-api-service-mock.ts";
import { DungeonApiServiceMock } from "@/tests/common/mocks/dungeon-api-service-mock.ts";
import { makeEncounterApiServiceMock } from "@/tests/common/mocks/encounter-api-service-mock.ts";
import { FellowshipTrackerMock } from "@/tests/common/mocks/fellowship-tracker-service-mock.ts";
import { UnitApiServiceMock } from "@/tests/common/mocks/unit-api-service-mock.ts";
import { runTest } from "@/tests/common/run-test.ts";

const DUNGEON_ID = "24";
const ENCOUNTER_ID = "33";
const UNKNOWN_ENCOUNTER_ID = "999999";

const TEST_CREATED_AT = DateTime.makeUnsafe("2026-01-01T00:00:00.000Z");
const TEST_UPDATED_AT = DateTime.makeUnsafe("2026-01-01T00:00:00.000Z");

const encounter = {
  createdAt: TEST_CREATED_AT,
  dungeonId: DUNGEON_ID,
  id: ENCOUNTER_ID,
  name: "Vexira",
  updatedAt: TEST_UPDATED_AT,
} satisfies EncounterApiEncounter;

function makeEncounterApiServerTestLayer(
  encounterApiServiceLayer: Layer.Layer<EncounterApiService>,
) {
  const apiServicesLayer = Layer.mergeAll(
    AbilityApiServiceMock,
    ConfigurationApiServiceMock,
    DungeonApiServiceMock,
    encounterApiServiceLayer,
    FellowshipTrackerMock,
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

describe("encounter client", () => {
  test("gets all encounters", async () => {
    const encounterApiServiceMock = makeEncounterApiServiceMock({
      getAll: () => {
        return E.succeed([encounter]);
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const getEncounters = getEncountersBase(baseUrl);

        const encounters = yield* getEncounters();

        expect(encounters).toEqual([encounter]);
      }).pipe(
        E.provide(makeEncounterApiServerTestLayer(encounterApiServiceMock)),
      ),
    );

    await runTest(program);
  });

  test("gets an encounter", async () => {
    const encounterApiServiceMock = makeEncounterApiServiceMock({
      getById: ({ dungeonId, id }) => {
        if (dungeonId === DUNGEON_ID && id === ENCOUNTER_ID) {
          return E.succeed(Option.some(encounter));
        }

        return E.succeed(Option.none());
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const getEncounter = getEncounterBase(baseUrl);

        const result = yield* getEncounter({
          dungeonId: DUNGEON_ID,
          id: ENCOUNTER_ID,
        });

        expect(result).toEqual(encounter);
      }).pipe(
        E.provide(makeEncounterApiServerTestLayer(encounterApiServiceMock)),
      ),
    );

    await runTest(program);
  });

  test("returns NotFound when an encounter does not exist", async () => {
    const encounterApiServiceMock = makeEncounterApiServiceMock();

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const getEncounter = getEncounterBase(baseUrl);

        const wasNotFound = yield* getEncounter({
          dungeonId: DUNGEON_ID,
          id: UNKNOWN_ENCOUNTER_ID,
        }).pipe(
          E.as(false),
          E.catchTag("NotFound", () => {
            return E.succeed(true);
          }),
        );

        expect(wasNotFound).toBe(true);
      }).pipe(
        E.provide(makeEncounterApiServerTestLayer(encounterApiServiceMock)),
      ),
    );

    await runTest(program);
  });
});

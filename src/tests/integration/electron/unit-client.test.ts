import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as HttpServer from "effect/unstable/http/HttpServer";
import { describe, expect, test } from "vitest";

import {
  getUnitBase,
  getUnitsBase,
} from "@/electron/renderer/api/unit-client.ts";
import { type UnitApiUnit } from "@/services/api/unit/unit-api-schema.ts";
import { type UnitApiService } from "@/services/api/unit/unit-api-service.ts";
import { makeApiServerTestLayer } from "@/tests/common/layers/api-server-test-layer.ts";
import { AbilityApiServiceMock } from "@/tests/common/mocks/ability-api-service-mock.ts";
import { ConfigurationApiServiceMock } from "@/tests/common/mocks/configuration-api-service-mock.ts";
import { DungeonApiServiceMock } from "@/tests/common/mocks/dungeon-api-service-mock.ts";
import { EncounterApiServiceMock } from "@/tests/common/mocks/encounter-api-service-mock.ts";
import { TrackerApiServiceMock } from "@/tests/common/mocks/tracker-api-service-mock.ts";
import { makeUnitApiServiceMock } from "@/tests/common/mocks/unit-api-service-mock.ts";
import { runTest } from "@/tests/common/run-test.ts";

const UNIT_ID = "42";
const UNKNOWN_UNIT_ID = "999999";

const unit = {
  id: UNIT_ID,
  name: "Desecrator",
} satisfies UnitApiUnit;

function makeUnitApiServerTestLayer(
  unitApiServiceLayer: Layer.Layer<UnitApiService>,
) {
  const apiServicesLayer = Layer.mergeAll(
    AbilityApiServiceMock,
    ConfigurationApiServiceMock,
    DungeonApiServiceMock,
    EncounterApiServiceMock,
    TrackerApiServiceMock,
    unitApiServiceLayer,
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

describe("unit client", () => {
  test("gets all units", async () => {
    const unitApiServiceMock = makeUnitApiServiceMock({
      getAll: () => {
        return E.succeed([unit]);
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const getUnits = getUnitsBase(baseUrl);

        const units = yield* getUnits();

        expect(units).toEqual([unit]);
      }).pipe(E.provide(makeUnitApiServerTestLayer(unitApiServiceMock))),
    );

    await runTest(program);
  });

  test("gets a unit", async () => {
    const unitApiServiceMock = makeUnitApiServiceMock({
      getById: ({ id }) => {
        if (id === UNIT_ID) {
          return E.succeed(Option.some(unit));
        }

        return E.succeed(Option.none());
      },
    });

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const getUnit = getUnitBase(baseUrl);

        const result = yield* getUnit({
          id: UNIT_ID,
        });

        expect(result).toEqual(unit);
      }).pipe(E.provide(makeUnitApiServerTestLayer(unitApiServiceMock))),
    );

    await runTest(program);
  });

  test("returns NotFound when a unit does not exist", async () => {
    const unitApiServiceMock = makeUnitApiServiceMock();

    const program = E.scoped(
      E.gen(function* () {
        const httpServer = yield* HttpServer.HttpServer;
        const baseUrl = getHttpUrl(httpServer.address);

        const getUnit = getUnitBase(baseUrl);

        const wasNotFound = yield* getUnit({
          id: UNKNOWN_UNIT_ID,
        }).pipe(
          E.as(false),
          E.catchTag("NotFound", () => {
            return E.succeed(true);
          }),
        );

        expect(wasNotFound).toBe(true);
      }).pipe(E.provide(makeUnitApiServerTestLayer(unitApiServiceMock))),
    );

    await runTest(program);
  });
});

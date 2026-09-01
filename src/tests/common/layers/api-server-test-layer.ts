import { NodeHttpServer } from "@effect/platform-node";
import * as Layer from "effect/Layer";

import { ApiServer } from "@/api/api-server.ts";
import { type FellowshipTracker } from "@/application/tracking/fellowship-tracker-service.ts";
import { type AbilityApiService } from "@/services/api/ability/ability-api-service.ts";
import { type ConfigurationApiService } from "@/services/api/configuration/configuration-api-service.ts";
import { type DungeonApiService } from "@/services/api/dungeon/dungeon-api-service.ts";
import { type EncounterApiService } from "@/services/api/encounter/encounter-api-service.ts";
import { type UnitApiService } from "@/services/api/unit/unit-api-service.ts";
import {
  DungeonRunWebSocketBroadcasterLive,
  TrackingWebSocketBroadcasterLive,
} from "@/services/api/websocket-broadcaster-service.ts";
import { AbilityApiServiceMock } from "@/tests/common/mocks/ability-api-service-mock.ts";
import { ConfigurationApiServiceMock } from "@/tests/common/mocks/configuration-api-service-mock.ts";
import { DungeonApiServiceMock } from "@/tests/common/mocks/dungeon-api-service-mock.ts";
import { EncounterApiServiceMock } from "@/tests/common/mocks/encounter-api-service-mock.ts";
import { FellowshipTrackerMock } from "@/tests/common/mocks/fellowship-tracker-service-mock.ts";
import { UnitApiServiceMock } from "@/tests/common/mocks/unit-api-service-mock.ts";

export type ApiServices =
  | AbilityApiService
  | ConfigurationApiService
  | DungeonApiService
  | EncounterApiService
  | FellowshipTracker
  | UnitApiService;

export const ApiServicesTest: Layer.Layer<ApiServices> = Layer.mergeAll(
  AbilityApiServiceMock,
  ConfigurationApiServiceMock,
  DungeonApiServiceMock,
  EncounterApiServiceMock,
  FellowshipTrackerMock,
  UnitApiServiceMock,
);

export function makeApiServerTestLayer(
  apiServicesLayer: Layer.Layer<ApiServices>,
) {
  return ApiServer.pipe(
    Layer.provideMerge(DungeonRunWebSocketBroadcasterLive),
    Layer.provideMerge(TrackingWebSocketBroadcasterLive),
    Layer.provideMerge(apiServicesLayer),
    Layer.provideMerge(NodeHttpServer.layerTest),
  );
}

export const ApiServerTest = makeApiServerTestLayer(ApiServicesTest);

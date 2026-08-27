import * as Layer from "effect/Layer";

import { ApiServer } from "@/api/api-server.ts";
import { FellowshipTrackerLive } from "@/application/tracking/fellowship-tracker-service.ts";
import { makeAppLive } from "@/layers/app-layer.ts";
import { AbilityApiServiceLive } from "@/services/api/ability/ability-api-service.ts";
import { ConfigurationApiServiceLive } from "@/services/api/configuration/configuration-api-service.ts";
import { DungeonApiServiceLive } from "@/services/api/dungeon/dungeon-api-service.ts";
import { EncounterApiServiceLive } from "@/services/api/encounter/encounter-api-service.ts";
import { NodeApiHttpServerLive } from "@/services/api/node-api-http-server.ts";
import { UnitApiServiceLive } from "@/services/api/unit/unit-api-service.ts";
import { WebSocketBroadcasterLive } from "@/services/api/websocket-broadcaster-service.ts";
import { type DatabaseOptions } from "@/types/app-options.ts";

export type MakeApiAppLiveOptions = DatabaseOptions;

export function makeApiAppLive(options: MakeApiAppLiveOptions) {
  const AppLive = makeAppLive(options);

  const ApiServicesLive = Layer.mergeAll(
    AbilityApiServiceLive,
    ConfigurationApiServiceLive,
    DungeonApiServiceLive,
    EncounterApiServiceLive,
    UnitApiServiceLive,
  ).pipe(Layer.provide(AppLive));

  const FellowshipTrackerWithDependencies = FellowshipTrackerLive.pipe(
    Layer.provide(WebSocketBroadcasterLive),
    Layer.provide(AppLive),
  );

  const ApiServerWithDependencies = ApiServer.pipe(
    Layer.provide(WebSocketBroadcasterLive),
    Layer.provide(ApiServicesLive),
    Layer.provide(FellowshipTrackerWithDependencies),
    Layer.provide(NodeApiHttpServerLive),
  );

  return Layer.mergeAll(
    AppLive,
    WebSocketBroadcasterLive,
    ApiServicesLive,
    FellowshipTrackerWithDependencies,
    NodeApiHttpServerLive,
    ApiServerWithDependencies,
  );
}

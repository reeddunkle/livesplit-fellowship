import * as Layer from "effect/Layer";

import { ApiServer } from "@/api/api-server.ts";
import { makeAppLive } from "@/layers/app-layer.ts";
import { AbilityApiServiceLive } from "@/services/api/ability/ability-api-service.ts";
import { ConfigurationApiServiceLive } from "@/services/api/configuration/configuration-api-service.ts";
import { DungeonApiServiceLive } from "@/services/api/dungeon/dungeon-api-service.ts";
import { DungeonRunApiServiceLive } from "@/services/api/dungeon-run/dungeon-run-api-service.ts";
import { EncounterApiServiceLive } from "@/services/api/encounter/encounter-api-service.ts";
import { LiveSplitApiServiceLive } from "@/services/api/live-split/live-split-api-service.ts";
import { NodeApiHttpServerLive } from "@/services/api/node-api-http-server.ts";
import { UnitApiServiceLive } from "@/services/api/unit/unit-api-service.ts";
import { type DatabaseOptions } from "@/types/app-options.ts";

export type MakeApiAppLiveOptions = DatabaseOptions;

export function makeApiAppLive(options: MakeApiAppLiveOptions) {
  const AppLive = makeAppLive(options);

  const ApiServicesLive = Layer.mergeAll(
    AbilityApiServiceLive,
    ConfigurationApiServiceLive,
    DungeonApiServiceLive,
    EncounterApiServiceLive,
    LiveSplitApiServiceLive,
    UnitApiServiceLive,
    DungeonRunApiServiceLive,
  ).pipe(Layer.provide(AppLive));

  const ApiServerDependencies = Layer.mergeAll(
    AppLive,
    ApiServicesLive,
    NodeApiHttpServerLive,
  );

  const ApiServerWithDependencies = ApiServer.pipe(
    Layer.provide(ApiServerDependencies),
  );

  return Layer.mergeAll(ApiServerDependencies, ApiServerWithDependencies);
}

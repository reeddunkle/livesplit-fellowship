import * as Layer from "effect/Layer";

import { ApiServer } from "@/api/api-server.ts";
import { makeAppLive } from "@/layers/app-layer.ts";
import { ConfigurationApiServiceLive } from "@/services/api/configuration/configuration-api-service.ts";
import { NodeApiHttpServerLive } from "@/services/api/node-api-http-server.ts";
import { PushEventServerLive } from "@/services/api/push-event-server-service.ts";
import { type DatabaseOptions } from "@/types/app-options.ts";

export type MakeApiAppLiveOptions = DatabaseOptions;

export function makeApiAppLive(options: MakeApiAppLiveOptions) {
  const AppLive = makeAppLive(options);

  const ConfigurationApiServiceWithDependencies =
    ConfigurationApiServiceLive.pipe(Layer.provide(AppLive));

  const ApiServerWithDependencies = ApiServer.pipe(
    Layer.provide(PushEventServerLive),
    Layer.provide(NodeApiHttpServerLive),
    Layer.provide(ConfigurationApiServiceWithDependencies),
  );

  return Layer.mergeAll(
    AppLive,
    PushEventServerLive,
    NodeApiHttpServerLive,
    ConfigurationApiServiceWithDependencies,
    ApiServerWithDependencies,
  );
}

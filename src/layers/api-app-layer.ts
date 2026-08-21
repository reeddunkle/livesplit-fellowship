import * as Layer from "effect/Layer";

import { ApiServer } from "@/api/api-server.ts";
import { makeAppLive } from "@/layers/app-layer.ts";
import { NodeApiHttpServerLive } from "@/services/api/node-api-http-server.ts";
import { PushEventServerLive } from "@/services/api/push-event-server-service.ts";
import { type DatabaseOptions } from "@/types/app-options.ts";

export type MakeApiAppLiveOptions = DatabaseOptions;

const ApiServerWithDependencies = ApiServer.pipe(
  Layer.provide(PushEventServerLive),
  Layer.provide(NodeApiHttpServerLive),
);

export function makeApiAppLive({ databaseFilename }: MakeApiAppLiveOptions) {
  return Layer.mergeAll(
    makeAppLive({
      databaseFilename,
    }),
    PushEventServerLive,
    NodeApiHttpServerLive,
    ApiServerWithDependencies,
  );
}

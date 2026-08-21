import * as Layer from "effect/Layer";

import { ApiServer } from "@/api/api-server.ts";
import { makeAppLive } from "@/layers/app-layer.ts";
import { NodeApiHttpServerLive } from "@/services/api/node-api-http-server.ts";
import { PushEventServerLive } from "@/services/api/push-event-server-service.ts";

const ApiServerWithDependencies = ApiServer.pipe(
  Layer.provide(PushEventServerLive),
  Layer.provide(NodeApiHttpServerLive),
);

export function makeApiAppLive(databaseFilename: string) {
  return Layer.mergeAll(
    makeAppLive(databaseFilename),
    PushEventServerLive,
    NodeApiHttpServerLive,
    ApiServerWithDependencies,
  );
}

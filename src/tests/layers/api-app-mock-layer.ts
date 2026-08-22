import * as E from "effect/Effect";
import * as Layer from "effect/Layer";

import { makeAppServicesLive } from "@/layers/app-layer.ts";
import { WebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
import { makeWebSocketBroadcasterTestHarness } from "@/tests/common/websocket-broadcaster-test-harness.ts";

export function makeApiAppMock(databaseFilename = ":memory:") {
  return E.gen(function* () {
    const webSocketBroadcasterHarness =
      yield* makeWebSocketBroadcasterTestHarness();

    const webSocketBroadcasterLayer = Layer.succeed(
      WebSocketBroadcaster,
      webSocketBroadcasterHarness.webSocketBroadcaster,
    );

    const layer = Layer.mergeAll(
      makeAppServicesLive({
        databaseFilename,
      }),
      webSocketBroadcasterLayer,
    );

    return {
      layer,
      webSocketBroadcasterHarness,
    };
  });
}

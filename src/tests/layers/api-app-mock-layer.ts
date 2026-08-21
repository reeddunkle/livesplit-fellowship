import * as E from "effect/Effect";
import * as Layer from "effect/Layer";

import { makeAppServicesLive } from "@/layers/app-layer.ts";
import { PushEventServer } from "@/services/api/push-event-server-service.ts";
import { makePushEventServerTestHarness } from "@/tests/common/push-event-server-test-harness.ts";

export function makeApiAppMock(databaseFilename = ":memory:") {
  return E.gen(function* () {
    const harness = yield* makePushEventServerTestHarness();

    const pushEventServerLayer = Layer.succeed(
      PushEventServer,
      harness.pushEventServer,
    );

    const layer = Layer.mergeAll(
      makeAppServicesLive({
        databaseFilename,
      }),
      pushEventServerLayer,
    );

    return {
      harness,
      layer,
    };
  });
}

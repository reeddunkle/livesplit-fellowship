import * as E from "effect/Effect";
import * as Layer from "effect/Layer";

import { AppServicesLive } from "@/layers/app-layer.ts";
import { PushEventServer } from "@/services/api/push-event-server-service.ts";
import { makePushEventServerTestHarness } from "@/tests/common/push-event-server-test-harness.ts";
import { NoopLoggerLayer } from "@/tests/layers/noop-logger-layer.ts";

export function makeApiAppMock() {
  return E.gen(function* () {
    const harness = yield* makePushEventServerTestHarness();

    const pushEventServerLayer = Layer.succeed(
      PushEventServer,
      harness.pushEventServer,
    );

    const layer = Layer.mergeAll(
      AppServicesLive,
      pushEventServerLayer,
      NoopLoggerLayer,
    );

    return {
      harness,
      layer,
    };
  });
}

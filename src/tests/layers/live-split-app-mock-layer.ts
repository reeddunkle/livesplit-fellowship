import * as E from "effect/Effect";
import * as Layer from "effect/Layer";

import { AppServicesLive } from "@/layers/app-layer.ts";
import { LiveSplitCLILive } from "@/services/cli/live-split-cli-service.ts";
import { makeLiveSplitTestHarness } from "@/tests/common/live-split-test-harness.ts";
import { NoopLoggerLayer } from "@/tests/layers/noop-logger-layer.ts";

export function makeLiveSplitAppMock() {
  return E.gen(function* () {
    const harness = yield* makeLiveSplitTestHarness();

    const layer = Layer.mergeAll(
      AppServicesLive,
      harness.clientLayer,
      LiveSplitCLILive,
      NoopLoggerLayer,
    );

    return {
      harness,
      layer,
    };
  });
}

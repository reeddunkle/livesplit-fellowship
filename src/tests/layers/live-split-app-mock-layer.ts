import * as E from "effect/Effect";
import * as Layer from "effect/Layer";

import { makeAppServicesLive } from "@/layers/app-layer.ts";
import { makeLiveSplitTestHarness } from "@/tests/common/live-split-test-harness.ts";

export function makeLiveSplitAppMock(databaseFilename = ":memory:") {
  return E.gen(function* () {
    const harness = yield* makeLiveSplitTestHarness();

    const layer = Layer.mergeAll(
      makeAppServicesLive(databaseFilename),
      harness.clientLayer,
    );

    return {
      harness,
      layer,
    };
  });
}

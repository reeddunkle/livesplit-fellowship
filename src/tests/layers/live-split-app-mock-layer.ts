import * as E from "effect/Effect";
import * as Layer from "effect/Layer";

import { makeAppServicesLive } from "@/layers/app-layer.ts";
import { makeLiveSplitTestHarness } from "@/tests/common/live-split-test-harness.ts";

export type MakeLiveSplitAppMockOptions = {
  readonly databaseFilename?: string;
};

export function makeLiveSplitAppMock({
  databaseFilename = ":memory:",
}: MakeLiveSplitAppMockOptions = {}) {
  return E.gen(function* () {
    const harness = yield* makeLiveSplitTestHarness();

    const layer = Layer.mergeAll(
      makeAppServicesLive({
        databaseFilename,
      }),
      harness.clientLayer,
    );

    return {
      harness,
      layer,
    };
  });
}

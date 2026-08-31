import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { makeAppServicesLive } from "@/layers/app-layer.ts";
import {
  LiveSplitConnectionManager,
  type LiveSplitConnectionManagerService,
} from "@/services/live-split/core/live-split-connection-manager-service.ts";
import { LiveSplitLive } from "@/services/live-split/core/live-split-service.ts";
import { makeLiveSplitTestHarness } from "@/tests/common/harnesses/live-split-test-harness.ts";

export type MakeLiveSplitAppMockOptions = {
  readonly databaseFilename?: string;
};

export function makeLiveSplitAppMock({
  databaseFilename = ":memory:",
}: MakeLiveSplitAppMockOptions = {}) {
  return E.gen(function* () {
    const harness = yield* makeLiveSplitTestHarness();

    const connectionManagerTest = Layer.succeed(LiveSplitConnectionManager, {
      client: E.succeed(Option.some(harness.client)),
      connect: () => E.void,
      disconnect: () => E.void,
      status: E.succeed({
        _tag: "Connected",
      }),
    } satisfies LiveSplitConnectionManagerService);

    const liveSplitTest = LiveSplitLive.pipe(
      Layer.provide(connectionManagerTest),
    );

    const layer = Layer.mergeAll(
      makeAppServicesLive({
        databaseFilename,
      }),
      connectionManagerTest,
      liveSplitTest,
    );

    return {
      harness,
      layer,
    };
  });
}

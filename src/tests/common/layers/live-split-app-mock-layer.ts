import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { FellowshipTrackerLive } from "@/application/tracking/fellowship-tracker-service.ts";
import { makeAppServicesLive } from "@/layers/app-layer.ts";
import { WebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
import {
  LiveSplitConnectionManager,
  type LiveSplitConnectionManagerService,
} from "@/services/live-split/core/live-split-connection-manager-service.ts";
import { LiveSplitLive } from "@/services/live-split/core/live-split-service.ts";
import { makeLiveSplitTestHarness } from "@/tests/common/harnesses/live-split-test-harness.ts";
import { makeWebSocketBroadcasterTestHarness } from "@/tests/common/harnesses/websocket-broadcaster-test-harness.ts";

export type MakeLiveSplitAppMockOptions = {
  readonly databaseFilename?: string;
};

export function makeLiveSplitAppMock({
  databaseFilename = ":memory:",
}: MakeLiveSplitAppMockOptions = {}) {
  return E.gen(function* () {
    const liveSplitHarness = yield* makeLiveSplitTestHarness();

    const webSocketBroadcasterHarness =
      yield* makeWebSocketBroadcasterTestHarness();

    const appServicesTest = makeAppServicesLive({
      databaseFilename,
    });

    const connectionManagerTest = Layer.succeed(LiveSplitConnectionManager, {
      client: E.succeed(Option.some(liveSplitHarness.client)),
      connect: () => {
        return E.void;
      },
      disconnect: () => {
        return E.void;
      },
      status: E.succeed({
        _tag: "Connected",
      }),
    } satisfies LiveSplitConnectionManagerService);

    const liveSplitTest = LiveSplitLive.pipe(
      Layer.provide(connectionManagerTest),
    );

    const WebSocketBroadcasterMock = Layer.succeed(
      WebSocketBroadcaster,
      webSocketBroadcasterHarness.webSocketBroadcaster,
    );

    const trackerDependencies = Layer.mergeAll(
      appServicesTest,
      liveSplitTest,
      WebSocketBroadcasterMock,
    );

    const fellowshipTrackerTest = FellowshipTrackerLive.pipe(
      Layer.provide(trackerDependencies),
    );

    const layer = Layer.mergeAll(
      appServicesTest,
      connectionManagerTest,
      liveSplitTest,
      WebSocketBroadcasterMock,
      fellowshipTrackerTest,
    );

    return {
      harness: liveSplitHarness,
      layer,
      webSocketBroadcasterHarness,
    };
  });
}

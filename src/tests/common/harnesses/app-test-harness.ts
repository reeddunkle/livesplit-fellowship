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

import { makeLiveSplitTestHarness } from "./live-split-test-harness.ts";
import { makeWebSocketBroadcasterTestHarness } from "./websocket-broadcaster-test-harness.ts";

export type MakeAppTestHarnessOptions = {
  readonly databaseFilename?: string;
};

export function makeAppTestHarness({
  databaseFilename = ":memory:",
}: MakeAppTestHarnessOptions = {}) {
  return E.gen(function* () {
    const liveSplitHarness = yield* makeLiveSplitTestHarness();

    const webSocketBroadcasterHarness =
      yield* makeWebSocketBroadcasterTestHarness();

    const appServicesTest = makeAppServicesLive({
      databaseFilename,
    });

    const liveSplitConnectionManagerTest = Layer.succeed(
      LiveSplitConnectionManager,
      {
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
      } satisfies LiveSplitConnectionManagerService,
    );

    const liveSplitTest = LiveSplitLive.pipe(
      Layer.provide(liveSplitConnectionManagerTest),
    );

    const webSocketBroadcasterTest = Layer.succeed(
      WebSocketBroadcaster,
      webSocketBroadcasterHarness.webSocketBroadcaster,
    );

    const fellowshipTrackerDependencies = Layer.mergeAll(
      appServicesTest,
      liveSplitTest,
      webSocketBroadcasterTest,
    );

    const fellowshipTrackerTest = FellowshipTrackerLive.pipe(
      Layer.provide(fellowshipTrackerDependencies),
    );

    const layer = Layer.mergeAll(
      appServicesTest,
      liveSplitConnectionManagerTest,
      liveSplitTest,
      webSocketBroadcasterTest,
      fellowshipTrackerTest,
    );

    return {
      layer,
      liveSplitHarness,
      webSocketBroadcasterHarness,
    };
  });
}

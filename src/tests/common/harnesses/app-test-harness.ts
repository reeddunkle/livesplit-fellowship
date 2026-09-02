import * as E from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";

import { FellowshipTrackerLive } from "@/application/tracking/fellowship-tracker-service.ts";
import { DungeonRunDAOLive } from "@/db/daos/dungeon-run/dungeon-run-dao-live.ts";
import { DungeonRunObservationDAOLive } from "@/db/daos/dungeon-run-observation/dungeon-run-observation-dao-live.ts";
import { makeAppServicesLive } from "@/layers/app-layer.ts";
import { DungeonRunWebSocketBroadcaster } from "@/services/api/websocket-broadcaster-service.ts";
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

    const dungeonRunWebSocketBroadcasterHarness =
      yield* makeWebSocketBroadcasterTestHarness();

    const appServicesTest = makeAppServicesLive({
      databaseFilename,
    });

    const dungeonRunDAOTest = DungeonRunDAOLive.pipe(
      Layer.provide(appServicesTest),
    );

    const dungeonRunObservationDAOTest = DungeonRunObservationDAOLive.pipe(
      Layer.provide(appServicesTest),
    );

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
        statusChanges: Stream.make({
          _tag: "Connected",
        }),
      } satisfies LiveSplitConnectionManagerService,
    );

    const liveSplitTest = LiveSplitLive.pipe(
      Layer.provide(liveSplitConnectionManagerTest),
    );

    const dungeonRunWebSocketBroadcasterTest = Layer.succeed(
      DungeonRunWebSocketBroadcaster,
      dungeonRunWebSocketBroadcasterHarness.webSocketBroadcaster,
    );

    const fellowshipTrackerDependencies = Layer.mergeAll(
      appServicesTest,
      dungeonRunDAOTest,
      dungeonRunObservationDAOTest,
      liveSplitTest,
      dungeonRunWebSocketBroadcasterTest,
    );

    const fellowshipTrackerTest = FellowshipTrackerLive.pipe(
      Layer.provide(fellowshipTrackerDependencies),
    );

    const layer = Layer.mergeAll(
      appServicesTest,
      dungeonRunDAOTest,
      dungeonRunObservationDAOTest,
      liveSplitConnectionManagerTest,
      liveSplitTest,
      dungeonRunWebSocketBroadcasterTest,
      fellowshipTrackerTest,
    );

    return {
      dungeonRunWebSocketBroadcasterHarness,
      layer,
      liveSplitHarness,
    };
  });
}

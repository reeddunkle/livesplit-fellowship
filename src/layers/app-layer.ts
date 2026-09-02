import { NodeFileSystem, NodePath } from "@effect/platform-node";
import * as Layer from "effect/Layer";

import { FellowshipTrackerLive } from "@/application/tracking/fellowship-tracker-service.ts";
import { DungeonRunDAOLive } from "@/db/daos/dungeon-run/dungeon-run-dao-live.ts";
import { DungeonRunObservationDAOLive } from "@/db/daos/dungeon-run-observation/dungeon-run-observation-dao-live.ts";
import { AppLoggerLive } from "@/layers/app-logger-live.ts";
import {
  type MakePersistenceLayerOptions,
  makePersistenceLayer,
} from "@/layers/persistence-layer.ts";
import {
  DungeonRunWebSocketBroadcasterLive,
  LiveSplitWebSocketBroadcasterLive,
  TrackingWebSocketBroadcasterLive,
} from "@/services/api/websocket-broadcaster-service.ts";
import { FellowshipLive } from "@/services/fellowship/fellowship-service.ts";
import { FileMonitorLive } from "@/services/filesystem/file-monitor-service.ts";
import { LiveSplitConnectionManagerLive } from "@/services/live-split/core/live-split-connection-manager-service.ts";
import { LiveSplitLive } from "@/services/live-split/core/live-split-service.ts";
import { LiveSplitFileLive } from "@/services/live-split/files/live-split-file-service.ts";

export type MakeAppServicesLiveOptions = MakePersistenceLayerOptions;

export type MakeAppLiveOptions = MakeAppServicesLiveOptions;

const PlatformLive = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

const AppLoggerWithPlatform = AppLoggerLive.pipe(Layer.provide(PlatformLive));

const FileMonitorWithPlatform = FileMonitorLive.pipe(
  Layer.provide(PlatformLive),
);

const FellowshipWithDependencies = FellowshipLive.pipe(
  Layer.provide(FileMonitorWithPlatform),
);

export function makeAppServicesLive(options: MakeAppServicesLiveOptions) {
  return Layer.mergeAll(
    PlatformLive,
    FileMonitorWithPlatform,
    FellowshipWithDependencies,
    LiveSplitFileLive,
    makePersistenceLayer(options),
  );
}

export function makeAppLive(options: MakeAppLiveOptions) {
  const appServicesLive = makeAppServicesLive(options);

  const liveSplitWithDependencies = LiveSplitLive.pipe(
    Layer.provide(LiveSplitConnectionManagerLive),
  );

  const dungeonRunDAOWithDependencies = DungeonRunDAOLive.pipe(
    Layer.provide(appServicesLive),
  );

  const dungeonRunObservationDAOWithDependencies =
    DungeonRunObservationDAOLive.pipe(Layer.provide(appServicesLive));

  const fellowshipTrackerDependencies = Layer.mergeAll(
    appServicesLive,
    dungeonRunDAOWithDependencies,
    dungeonRunObservationDAOWithDependencies,
    liveSplitWithDependencies,
    DungeonRunWebSocketBroadcasterLive,
  );

  const fellowshipTrackerWithDependencies = FellowshipTrackerLive.pipe(
    Layer.provide(fellowshipTrackerDependencies),
  );

  return Layer.mergeAll(
    AppLoggerWithPlatform,
    appServicesLive,
    dungeonRunDAOWithDependencies,
    dungeonRunObservationDAOWithDependencies,
    DungeonRunWebSocketBroadcasterLive,
    fellowshipTrackerWithDependencies,
    LiveSplitConnectionManagerLive,
    LiveSplitWebSocketBroadcasterLive,
    liveSplitWithDependencies,
    TrackingWebSocketBroadcasterLive,
  );
}

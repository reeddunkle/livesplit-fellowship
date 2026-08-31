import { NodeFileSystem, NodePath } from "@effect/platform-node";
import * as Layer from "effect/Layer";

import { AppLoggerLive } from "@/layers/app-logger-live.ts";
import {
  type MakePersistenceLayerOptions,
  makePersistenceLayer,
} from "@/layers/persistence-layer.ts";
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

const LiveSplitWithDependencies = LiveSplitLive.pipe(
  Layer.provide(LiveSplitConnectionManagerLive),
);

export function makeAppServicesLive(options: MakeAppServicesLiveOptions) {
  return Layer.mergeAll(
    PlatformLive,
    FileMonitorWithPlatform,
    FellowshipWithDependencies,
    LiveSplitConnectionManagerLive,
    LiveSplitWithDependencies,
    LiveSplitFileLive,
    makePersistenceLayer(options),
  );
}

export function makeAppLive(options: MakeAppLiveOptions) {
  return Layer.mergeAll(AppLoggerWithPlatform, makeAppServicesLive(options));
}

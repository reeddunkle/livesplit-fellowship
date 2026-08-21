import { NodeFileSystem, NodePath } from "@effect/platform-node";
import * as Layer from "effect/Layer";

import { AppLoggerLive } from "@/layers/app-logger-live.ts";
import { makePersistenceLayer } from "@/layers/persistence-layer.ts";
import { FellowshipLive } from "@/services/fellowship/fellowship-service.ts";
import { FileMonitorLive } from "@/services/filesystem/file-monitor-service.ts";
import { LiveSplitFileLive } from "@/services/live-split/files/live-split-file-service.ts";
import { type DatabaseOptions } from "@/types/app-options.ts";

export type MakeAppServicesLiveOptions = DatabaseOptions;

export type MakeAppLiveOptions = DatabaseOptions;

const PlatformLive = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

const AppLoggerWithPlatform = AppLoggerLive.pipe(Layer.provide(PlatformLive));

const FileMonitorWithPlatform = FileMonitorLive.pipe(
  Layer.provide(PlatformLive),
);

const FellowshipWithDependencies = FellowshipLive.pipe(
  Layer.provide(FileMonitorWithPlatform),
);

export function makeAppServicesLive({
  databaseFilename,
}: MakeAppServicesLiveOptions) {
  return Layer.mergeAll(
    PlatformLive,
    FileMonitorWithPlatform,
    FellowshipWithDependencies,
    LiveSplitFileLive,
    makePersistenceLayer({
      databaseFilename,
    }),
  );
}

export function makeAppLive({ databaseFilename }: MakeAppLiveOptions) {
  return Layer.mergeAll(
    AppLoggerWithPlatform,
    makeAppServicesLive({
      databaseFilename,
    }),
  );
}

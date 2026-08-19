import { NodeFileSystem, NodePath } from "@effect/platform-node";
import * as Layer from "effect/Layer";

import { CLILive } from "@/cli/main.ts";
import { AppLoggerLive } from "@/layers/app-logger-live.ts";
import { FellowshipLive } from "@/services/fellowship/fellowship-service.ts";
import { FileMonitorLive } from "@/services/filesystem/file-monitor-service.ts";
import { LiveSplitFileLive } from "@/services/live-split/files/live-split-file-service.ts";

const PlatformLive = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

const AppLoggerWithPlatform = AppLoggerLive.pipe(Layer.provide(PlatformLive));

const FileMonitorWithPlatform = FileMonitorLive.pipe(
  Layer.provide(PlatformLive),
);

const FellowshipWithDependencies = FellowshipLive.pipe(
  Layer.provide(FileMonitorWithPlatform),
);

export const AppServicesLive = Layer.mergeAll(
  PlatformLive,
  FileMonitorWithPlatform,
  FellowshipWithDependencies,
  LiveSplitFileLive,
  CLILive,
);

// This layer intentionally excludes optional external integrations.
export const AppLive = Layer.mergeAll(AppLoggerWithPlatform, AppServicesLive);

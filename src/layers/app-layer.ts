import { NodeFileSystem, NodePath } from "@effect/platform-node";
import * as Layer from "effect/Layer";

import { AppLoggerLive } from "@/layers/app-logger-live.ts";
import { CLILive } from "@/services/cli/cli-service.ts";
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

/*
 * This layer intentionally excludes LiveSplitClientLive for now.
 * [TODO]: Find smarter way to manage TCP connection.
 */
export const AppLive = Layer.mergeAll(
  AppLoggerWithPlatform,
  PlatformLive,
  FileMonitorWithPlatform,
  FellowshipWithDependencies,
  LiveSplitFileLive,
  CLILive,
);

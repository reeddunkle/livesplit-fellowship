import * as Layer from "effect/Layer";

import { AppLive } from "@/layers/app-layer.ts";
import { LiveSplitCLILive } from "@/services/cli/live-split-cli-service.ts";
import { LiveSplitClientLive } from "@/services/live-split/client/live-split-client-service.ts";

/*
 * Constructing this layer opens the TCP connection to LiveSplit Server.
 *
 * Use it only for commands that actually communicate with LiveSplit.
 */
export const LiveSplitAppLive = Layer.mergeAll(
  AppLive,
  LiveSplitClientLive,
  LiveSplitCLILive,
);

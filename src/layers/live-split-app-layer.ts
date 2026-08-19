import * as Layer from "effect/Layer";

import { LiveSplitCLILive } from "@/cli/live-split-main.ts";
import { AppLive } from "@/layers/app-layer.ts";
import { LiveSplitClientLive } from "@/services/live-split/client/live-split-client-service.ts";

export const LiveSplitAppLive = Layer.mergeAll(
  AppLive,
  LiveSplitClientLive,
  LiveSplitCLILive,
);

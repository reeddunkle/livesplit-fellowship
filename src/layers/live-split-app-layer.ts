import * as Layer from "effect/Layer";

import { AppLive } from "@/layers/app-layer.ts";
import { LiveSplitClientLive } from "@/services/live-split/client/live-split-client-service.ts";

export const LiveSplitAppLive = Layer.mergeAll(AppLive, LiveSplitClientLive);

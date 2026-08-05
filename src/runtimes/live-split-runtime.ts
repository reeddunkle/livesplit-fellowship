import * as ManagedRuntime from "effect/ManagedRuntime";

import { LiveSplitAppLive } from "@/layers/live-split-app-layer.ts";

export const LiveSplitRuntime = ManagedRuntime.make(LiveSplitAppLive);

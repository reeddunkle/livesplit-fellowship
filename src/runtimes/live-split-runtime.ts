import type * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";

import { LiveSplitAppLive } from "@/layers/live-split-app-layer.ts";

export type LiveSplitRuntimeEnvironment = Layer.Success<
  typeof LiveSplitAppLive
>;

export const LiveSplitRuntime = ManagedRuntime.make(LiveSplitAppLive);

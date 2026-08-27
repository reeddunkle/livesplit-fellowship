import * as ManagedRuntime from "effect/ManagedRuntime";

import {
  type MakeLiveSplitAppLiveOptions,
  makeLiveSplitAppLive,
} from "@/layers/live-split-app-layer.ts";

export type MakeLiveSplitRuntimeOptions = MakeLiveSplitAppLiveOptions;

export function makeLiveSplitRuntime(options: MakeLiveSplitRuntimeOptions) {
  return ManagedRuntime.make(makeLiveSplitAppLive(options));
}

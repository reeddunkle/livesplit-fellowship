import * as ManagedRuntime from "effect/ManagedRuntime";

import { makeLiveSplitAppLive } from "@/layers/live-split-app-layer.ts";

export function makeLiveSplitRuntime(databaseFilename: string) {
  return ManagedRuntime.make(makeLiveSplitAppLive(databaseFilename));
}

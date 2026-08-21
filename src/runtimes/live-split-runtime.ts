import * as ManagedRuntime from "effect/ManagedRuntime";

import { makeLiveSplitAppLive } from "@/layers/live-split-app-layer.ts";
import { type DatabaseOptions } from "@/types/app-options.ts";

export type MakeLiveSplitRuntimeOptions = DatabaseOptions;

export function makeLiveSplitRuntime({
  databaseFilename,
}: MakeLiveSplitRuntimeOptions) {
  return ManagedRuntime.make(
    makeLiveSplitAppLive({
      databaseFilename,
    }),
  );
}

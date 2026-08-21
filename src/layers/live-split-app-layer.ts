import * as Layer from "effect/Layer";

import { makeAppLive } from "@/layers/app-layer.ts";
import { LiveSplitClientLive } from "@/services/live-split/client/live-split-client-service.ts";
import { type DatabaseOptions } from "@/types/app-options.ts";

export type MakeLiveSplitAppLiveOptions = DatabaseOptions;

export function makeLiveSplitAppLive({
  databaseFilename,
}: MakeLiveSplitAppLiveOptions) {
  return Layer.mergeAll(
    makeAppLive({
      databaseFilename,
    }),
    LiveSplitClientLive,
  );
}

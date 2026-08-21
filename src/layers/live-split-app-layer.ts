import * as Layer from "effect/Layer";

import { makeAppLive } from "@/layers/app-layer.ts";
import { LiveSplitClientLive } from "@/services/live-split/client/live-split-client-service.ts";

export function makeLiveSplitAppLive(databaseFilename: string) {
  return Layer.mergeAll(makeAppLive(databaseFilename), LiveSplitClientLive);
}

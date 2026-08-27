import * as Layer from "effect/Layer";

import { type MakeAppLiveOptions, makeAppLive } from "@/layers/app-layer.ts";
import { LiveSplitClientLive } from "@/services/live-split/client/live-split-client-service.ts";

export type MakeLiveSplitAppLiveOptions = MakeAppLiveOptions;

export function makeLiveSplitAppLive(options: MakeLiveSplitAppLiveOptions) {
  return Layer.mergeAll(makeAppLive(options), LiveSplitClientLive);
}

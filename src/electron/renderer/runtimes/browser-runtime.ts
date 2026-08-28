import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";

import { AppStateStoreLive } from "@/electron/renderer/stores/app-state/app-state-store-live.ts";

const BrowserLive = Layer.mergeAll(AppStateStoreLive);

export const browserRuntime = ManagedRuntime.make(BrowserLive);

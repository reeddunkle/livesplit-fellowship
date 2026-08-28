import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";

import { AppStateStorageLive } from "@/electron/renderer/storage/app-state/app-state-storage-live.ts";

const BrowserLive = Layer.mergeAll(AppStateStorageLive);

export const browserRuntime = ManagedRuntime.make(BrowserLive);

import * as ManagedRuntime from "effect/ManagedRuntime";

import { type MakeAppLiveOptions, makeAppLive } from "@/layers/app-layer.ts";

export type MakeAppRuntimeOptions = MakeAppLiveOptions;

export function makeAppRuntime(options: MakeAppRuntimeOptions) {
  return ManagedRuntime.make(makeAppLive(options));
}

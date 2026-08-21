import * as ManagedRuntime from "effect/ManagedRuntime";

import {
  type MakeApiAppLiveOptions,
  makeApiAppLive,
} from "@/layers/api-app-layer.ts";

export type MakeApiRuntimeOptions = MakeApiAppLiveOptions;

export function makeApiRuntime(options: MakeApiRuntimeOptions) {
  return ManagedRuntime.make(makeApiAppLive(options));
}

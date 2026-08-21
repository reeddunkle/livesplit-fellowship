import * as ManagedRuntime from "effect/ManagedRuntime";

import { makeApiAppLive } from "@/layers/api-app-layer.ts";

export function makeApiRuntime(databaseFilename: string) {
  return ManagedRuntime.make(makeApiAppLive(databaseFilename));
}

import * as ManagedRuntime from "effect/ManagedRuntime";

import { makeAppLive } from "@/layers/app-layer.ts";

export function makeAppRuntime(databaseFilename: string) {
  return ManagedRuntime.make(makeAppLive(databaseFilename));
}

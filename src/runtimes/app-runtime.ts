import * as ManagedRuntime from "effect/ManagedRuntime";

import { makeAppLive } from "@/layers/app-layer.ts";
import { type DatabaseOptions } from "@/types/app-options.ts";

export type MakeAppRuntimeOptions = DatabaseOptions;

export function makeAppRuntime({ databaseFilename }: MakeAppRuntimeOptions) {
  return ManagedRuntime.make(
    makeAppLive({
      databaseFilename,
    }),
  );
}

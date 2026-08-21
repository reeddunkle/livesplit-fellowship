import * as ManagedRuntime from "effect/ManagedRuntime";

import { makeApiAppLive } from "@/layers/api-app-layer.ts";
import { type DatabaseOptions } from "@/types/app-options.ts";

export type MakeApiRuntimeOptions = DatabaseOptions;

export function makeApiRuntime({ databaseFilename }: MakeApiRuntimeOptions) {
  return ManagedRuntime.make(
    makeApiAppLive({
      databaseFilename,
    }),
  );
}

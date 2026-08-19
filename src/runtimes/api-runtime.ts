import * as ManagedRuntime from "effect/ManagedRuntime";

import { ApiAppLive } from "@/layers/api-app-layer.ts";

export const ApiRuntime = ManagedRuntime.make(ApiAppLive);

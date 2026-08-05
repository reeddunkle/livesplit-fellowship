import * as ManagedRuntime from "effect/ManagedRuntime";

import { AppLive } from "@/layers/app-layer.ts";

export const AppRuntime = ManagedRuntime.make(AppLive);

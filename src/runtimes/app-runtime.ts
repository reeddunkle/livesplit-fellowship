import type * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";

import { AppLive } from "@/layers/app-layer.ts";

export type AppRuntimeEnvironment = Layer.Success<typeof AppLive>;

export const AppRuntime = ManagedRuntime.make(AppLive);

import * as E from "effect/Effect";
import type * as ManagedRuntime from "effect/ManagedRuntime";

type ShutdownElectronApplicationOptions<R, E> = {
  readonly runtime: ManagedRuntime.ManagedRuntime<R, E>;
};

export function shutdownElectronApplication<R, E>({
  runtime,
}: ShutdownElectronApplicationOptions<R, E>) {
  return E.tryPromise({
    catch: (cause) => {
      return new Error("Failed to shut down Electron application.", {
        cause,
      });
    },
    try: () => {
      return runtime.dispose();
    },
  });
}

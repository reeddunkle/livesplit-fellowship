import * as E from "effect/Effect";

import { runApiServer } from "@/application/api/run-api-server.ts";

import { type CreateWindowOptions, createWindow } from "./create-window.ts";

export type RunElectronApplicationOptions = CreateWindowOptions;

export function runElectronApplication(options: RunElectronApplicationOptions) {
  return E.scoped(
    E.gen(function* () {
      yield* runApiServer.pipe(E.forkScoped);

      yield* createWindow(options);

      return yield* E.never;
    }),
  );
}

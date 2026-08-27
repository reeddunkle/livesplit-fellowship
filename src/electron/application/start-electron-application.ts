import * as E from "effect/Effect";

import { runApiServer } from "@/application/api/run-api-server.ts";

import { type CreateWindowOptions, createWindow } from "./create-window.ts";

type StartElectronApplicationOptions = CreateWindowOptions;

export function startElectronApplication(
  options: StartElectronApplicationOptions,
) {
  return E.gen(function* () {
    yield* runApiServer.pipe(E.forkScoped);

    yield* createWindow(options);
  });
}

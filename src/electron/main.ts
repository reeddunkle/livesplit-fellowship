import path from "node:path";
import { fileURLToPath } from "node:url";
import * as E from "effect/Effect";
import { app, BrowserWindow } from "electron";

import { env } from "@/env.ts";
import { makeApiRuntime } from "@/runtimes/api-runtime.ts";

import { createWindow } from "./application/create-window.ts";
import { runElectronApplication } from "./application/run-electron-application.ts";
import { shutdownElectronApplication } from "./application/shutdown-electron-application.ts";

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));

const rendererDevServerUrl = app.isPackaged
  ? undefined
  : `http://${env.electronRenderer.host}:${env.electronRenderer.port}`;

const apiRuntime = makeApiRuntime({
  databaseFilename: env.databaseFilename,
});

let isShuttingDown = false;

const windowOptions = {
  currentDirectoryPath,
  rendererDevServerUrl,
};

void app.whenReady().then(() => {
  apiRuntime.runFork(
    runElectronApplication(windowOptions).pipe(
      E.catch((error) => {
        return E.sync(() => {
          console.error("Electron application failed.", error);
          app.quit();
        });
      }),
    ),
  );

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void apiRuntime.runPromise(createWindow(windowOptions));
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", (event) => {
  if (isShuttingDown) {
    return;
  }

  event.preventDefault();
  isShuttingDown = true;

  void E.runPromise(
    shutdownElectronApplication({
      runtime: apiRuntime,
    }),
  ).finally(() => {
    app.quit();
  });
});

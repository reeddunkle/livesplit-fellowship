import path from "node:path";
import * as E from "effect/Effect";
import { BrowserWindow } from "electron";

import { configureWindowOpenHandler } from "@/electron/application/configure-window-open-handler.ts";

export type CreateWindowOptions = {
  readonly currentDirectoryPath: string;
  readonly rendererDevServerUrl: string | undefined;
};

export function createWindow({
  currentDirectoryPath,
  rendererDevServerUrl,
}: CreateWindowOptions) {
  return E.tryPromise({
    catch: (cause) => {
      return new Error("Failed to load Electron renderer.", {
        cause,
      });
    },
    try: async () => {
      const preloadPath = path.join(currentDirectoryPath, "preload.cjs");

      const window = new BrowserWindow({
        height: 1100,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          preload: preloadPath,
          sandbox: true,
        },
        width: 1500,
      });

      configureWindowOpenHandler({
        preloadPath,
        window,
      });

      if (rendererDevServerUrl) {
        await window.loadURL(rendererDevServerUrl);
      } else {
        await window.loadFile(
          path.join(currentDirectoryPath, "renderer/index.html"),
        );
      }

      return window;
    },
  });
}

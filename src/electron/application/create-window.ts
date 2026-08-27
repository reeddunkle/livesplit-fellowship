import path from "node:path";
import * as E from "effect/Effect";
import { BrowserWindow } from "electron";

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
      const window = new BrowserWindow({
        height: 700,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
        width: 1000,
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

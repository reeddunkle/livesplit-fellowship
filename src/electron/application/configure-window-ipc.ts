import { BrowserWindow, ipcMain } from "electron";

import { ELECTRON_IPC_CHANNEL } from "@/electron/ipc/electron-ipc-channel.ts";

export function configureWindowIpc() {
  ipcMain.on(ELECTRON_IPC_CHANNEL.SHOW_WINDOW, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);

    window?.show();
  });
}

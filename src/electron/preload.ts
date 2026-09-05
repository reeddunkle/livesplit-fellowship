import { contextBridge, ipcRenderer } from "electron";

import { ELECTRON_IPC_CHANNEL } from "@/electron/ipc/electron-ipc-channel.ts";

contextBridge.exposeInMainWorld("electronAPI", {
  showWindow: () => {
    ipcRenderer.send(ELECTRON_IPC_CHANNEL.SHOW_WINDOW);
  },
});

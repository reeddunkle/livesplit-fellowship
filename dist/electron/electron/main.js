import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";
const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
function createWindow() {
    const window = new BrowserWindow({
        height: 700,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
        width: 1000,
    });
    void window.loadFile(path.join(currentDirectoryPath, "renderer/index.html"));
    return window;
}
app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
//# sourceMappingURL=main.js.map
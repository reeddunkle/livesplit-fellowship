import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "./",
  build: {
    emptyOutDir: false,
    outDir: "../../../dist/electron/renderer",
  },
  envDir: projectRoot,
  envPrefix: ["VITE_", "API_"],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  root: "src/electron/renderer",
});

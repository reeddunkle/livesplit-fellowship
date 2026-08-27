import path from "node:path";
import { defineConfig } from "vite";

const projectRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "dist/electron",
    rollupOptions: {
      output: {
        entryFileNames: "main.js",
      },
    },
    ssr: path.resolve(projectRoot, "src/electron/main.ts"),
    target: "node22",
  },
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "src"),
    },
  },
  ssr: {
    external: ["electron"],
  },
});

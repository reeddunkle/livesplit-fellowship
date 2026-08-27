import path from "node:path";
import { defineConfig } from "vitest/config";

const projectRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "./src"),
    },
  },
  test: {
    root: projectRoot,
    setupFiles: ["./src/tests/setup.ts"],
  },
});

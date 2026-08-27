import { createHashHistory, createRouter } from "@tanstack/react-router";

import { routeTree } from "@/electron/renderer/routeTree.gen.ts";

const history = createHashHistory();

export const router = createRouter({
  history,
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

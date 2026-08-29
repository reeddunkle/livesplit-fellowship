import { createRootRouteWithContext } from "@tanstack/react-router";

import { RootLayout } from "@/electron/renderer/components/layouts/root-layout";
import { type RouterContext } from "@/electron/renderer/router/router-context";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

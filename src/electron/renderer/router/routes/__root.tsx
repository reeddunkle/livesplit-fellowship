import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import { type RouterContext } from "@/electron/renderer/router/router-context";

function RootComponent() {
  return <Outlet />;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

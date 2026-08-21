export const ROUTES = {
  configurations: "/configurations",
  events: "/events",
};

export function getConfigurationRoute(id: string): string {
  return `${ROUTES.configurations}/${id}`;
}

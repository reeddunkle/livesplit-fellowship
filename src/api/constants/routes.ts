export const ROUTES = {
  configurations: "/configurations",
  events: "/events",
} as const;

export function getConfigurationRoute(id: string): string {
  return `${ROUTES.configurations}/${id}`;
}

import { ROUTES } from "@/api/constants/routes.ts";

export function getApiBaseUrl(): string {
  return `http://${import.meta.env.PUBLIC_API_HOST}:${import.meta.env.PUBLIC_API_PORT}`;
}

export function getApiWebSocketUrl(): string {
  return `ws://${import.meta.env.PUBLIC_API_HOST}:${import.meta.env.PUBLIC_API_PORT}${ROUTES.events}`;
}

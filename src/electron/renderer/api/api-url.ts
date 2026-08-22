import { ROUTES } from "@/api/constants/routes.ts";

export function getApiBaseUrl(): string {
  return `http://${import.meta.env.API_HOST}:${import.meta.env.API_PORT}`;
}

export function getApiWebSocketUrl(): string {
  return `ws://${import.meta.env.API_HOST}:${import.meta.env.API_PORT}${ROUTES.events}`;
}

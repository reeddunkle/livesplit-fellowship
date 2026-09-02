import * as Schema from "effect/Schema";

import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id-schema.ts";

export const ThemeSchema = Schema.Union([
  Schema.Literal("dark"),
  Schema.Literal("light"),
  Schema.Literal("system"),
]);

export type Theme = typeof ThemeSchema.Type;

export const AppStateSchema = Schema.Struct({
  selectedConfigurationId: Schema.NullOr(ConfigurationIdSchema),
  sidebarOpen: Schema.Boolean,
  theme: ThemeSchema,
});

export type AppState = typeof AppStateSchema.Type;

export const DEFAULT_APP_STATE: AppState = {
  selectedConfigurationId: null,
  sidebarOpen: true,
  theme: "dark",
} satisfies AppState;

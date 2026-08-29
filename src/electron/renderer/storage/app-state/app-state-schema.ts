import * as Schema from "effect/Schema";

import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id.ts";

export const AppStateSchema = Schema.Struct({
  selectedConfigurationId: Schema.NullOr(ConfigurationIdSchema),
});

export type AppState = typeof AppStateSchema.Type;

export const DEFAULT_APP_STATE: AppState = {
  selectedConfigurationId: null,
} satisfies AppState;

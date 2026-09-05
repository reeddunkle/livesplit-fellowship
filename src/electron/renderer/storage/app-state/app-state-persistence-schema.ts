import * as Schema from "effect/Schema";

import { AppStateSchema } from "./app-state-schema.ts";

export const CURRENT_APP_STATE_VERSION = 1;

export const PersistedAppStateV1Schema = Schema.Struct({
  state: AppStateSchema,
  version: Schema.Literal(CURRENT_APP_STATE_VERSION),
});

export type PersistedAppStateV1 = typeof PersistedAppStateV1Schema.Type;

export const PersistedAppStateSchema = PersistedAppStateV1Schema;

export type PersistedAppState = typeof PersistedAppStateSchema.Type;

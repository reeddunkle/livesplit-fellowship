import * as Schema from "effect/Schema";

import { ConfigurationFingerprintSchema } from "@/validation/configuration/configuration-fingerprint";

export const AppStateSchema = Schema.Struct({
  selectedConfigurationFingerprint: Schema.NullOr(
    ConfigurationFingerprintSchema,
  ),
});

export type AppState = typeof AppStateSchema.Type;

export const DEFAULT_APP_STATE: AppState = {
  selectedConfigurationFingerprint: null,
} satisfies AppState;

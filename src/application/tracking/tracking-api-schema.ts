import * as Schema from "effect/Schema";

import { DungeonIdSchema } from "@/services/fellowship/validation/fellowship-common.ts";
import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id-schema.ts";

export const StartTrackingApiRequestSchema = Schema.Struct({
  configurationId: ConfigurationIdSchema,
});

export type StartTrackingApiRequest = typeof StartTrackingApiRequestSchema.Type;

const PersistedTrackingApiSourceSchema = Schema.Struct({
  configurationId: ConfigurationIdSchema,
  type: Schema.Literal("Persisted"),
});

const ExternalTrackingApiSourceSchema = Schema.Struct({
  type: Schema.Literal("External"),
});

const TrackingApiSourceSchema = Schema.Union([
  PersistedTrackingApiSourceSchema,
  ExternalTrackingApiSourceSchema,
]);

const IdleTrackingApiStatusSchema = Schema.Struct({
  status: Schema.Literal("Idle"),
});

const ActiveTrackingApiStatusSchema = Schema.Struct({
  dungeonId: DungeonIdSchema,
  source: TrackingApiSourceSchema,
  status: Schema.Literal("Tracking"),
});

export const TrackingApiStatusSchema = Schema.Union([
  IdleTrackingApiStatusSchema,
  ActiveTrackingApiStatusSchema,
]);

export type TrackingApiStatus = typeof TrackingApiStatusSchema.Type;

import * as Schema from "effect/Schema";

import { DungeonIdSchema } from "@/services/fellowship/validation/fellowship-common.ts";
import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id.ts";

export const StartTrackingApiRequestSchema = Schema.Struct({
  configurationId: ConfigurationIdSchema,
});

export type StartTrackingApiRequest = typeof StartTrackingApiRequestSchema.Type;

const IdleTrackingApiStatusSchema = Schema.Struct({
  status: Schema.Literal("Idle"),
});

const ActiveTrackingApiStatusSchema = Schema.Struct({
  configurationId: ConfigurationIdSchema,
  dungeonId: DungeonIdSchema,
  status: Schema.Literal("Tracking"),
});

export const TrackingApiStatusSchema = Schema.Union([
  IdleTrackingApiStatusSchema,
  ActiveTrackingApiStatusSchema,
]);

export type TrackingApiStatus = typeof TrackingApiStatusSchema.Type;

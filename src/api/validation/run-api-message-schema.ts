import * as Schema from "effect/Schema";

import { RUN_API_EVENT } from "@/api/run-api-event.ts";

const RunStartedApiEventSchema = Schema.Struct({
  timestampMilliseconds: Schema.Number,
  type: Schema.Literal(RUN_API_EVENT.RUN_STARTED),
});

const RunExitedApiEventSchema = Schema.Struct({
  timestampMilliseconds: Schema.Number,
  type: Schema.Literal(RUN_API_EVENT.RUN_EXITED),
});

const MilestoneCompletedApiEventSchema = Schema.Struct({
  milestone: Schema.Struct({
    elapsedMilliseconds: Schema.Number,
    label: Schema.String,
    milestoneId: Schema.String,
    timestampMilliseconds: Schema.Number,
  }),
  type: Schema.Literal(RUN_API_EVENT.MILESTONE_COMPLETED),
});

const RunApiEventSchema = Schema.Union([
  RunStartedApiEventSchema,
  RunExitedApiEventSchema,
  MilestoneCompletedApiEventSchema,
]);

export const RunApiMessageSchema = Schema.Struct({
  event: RunApiEventSchema,
  version: Schema.Literal(1),
});

export type RunApiMessage = typeof RunApiMessageSchema.Type;

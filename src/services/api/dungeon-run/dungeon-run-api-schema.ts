import * as Schema from "effect/Schema";

import { RequirementEventTypeSchema } from "@/services/fellowship/validation/requirement-event-type-schema.ts";
import {
  NonEmptyStringSchema,
  PositiveIntegerSchema,
} from "@/validation/common-schemas.ts";
import { ConfigurationIdSchema } from "@/validation/configuration/configuration-id-schema.ts";

export const DungeonRunApiObservationStatisticsSchema = Schema.Struct({
  averageElapsedMilliseconds: Schema.Number,
  bestElapsedMilliseconds: Schema.Number,
  medianElapsedMilliseconds: Schema.Number,
  occurrence: PositiveIntegerSchema,
  sampleCount: PositiveIntegerSchema,
  targetId: NonEmptyStringSchema,
  type: RequirementEventTypeSchema,
});

export type DungeonRunApiObservationStatistics =
  typeof DungeonRunApiObservationStatisticsSchema.Type;

export const DungeonRunApiHistorySchema = Schema.Struct({
  configurationId: ConfigurationIdSchema,
  observations: Schema.Array(DungeonRunApiObservationStatisticsSchema),
});

export type DungeonRunApiHistory = typeof DungeonRunApiHistorySchema.Type;

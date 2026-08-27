import * as Schema from "effect/Schema";

import { FELLOWSHIP_EVENT } from "@/services/fellowship/constants/fellowship-event.ts";

export const MilestoneRequirementEventTypeSchema = Schema.Union([
  Schema.Literal(FELLOWSHIP_EVENT.ABILITY_ACTIVATED),
  Schema.Literal(FELLOWSHIP_EVENT.DUNGEON_START),
  Schema.Literal(FELLOWSHIP_EVENT.DUNGEON_END),
  Schema.Literal(FELLOWSHIP_EVENT.ENCOUNTER_START),
  Schema.Literal(FELLOWSHIP_EVENT.ENCOUNTER_END),
  Schema.Literal(FELLOWSHIP_EVENT.UNIT_DEATH),
]);

export type MilestoneRequirementEventType =
  typeof MilestoneRequirementEventTypeSchema.Type;

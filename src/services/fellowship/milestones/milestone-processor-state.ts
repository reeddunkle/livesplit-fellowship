import type * as DateTime from "effect/DateTime";
import * as HashMap from "effect/HashMap";

import { type MilestoneRequirementTargetId } from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

export type RequirementObservation = {
  readonly timestamp: DateTime.Utc;
};

export type RequirementObservationHistory = {
  readonly observations: ReadonlyArray<RequirementObservation>;
};

export type RequirementObservationsByTargetId = HashMap.HashMap<
  MilestoneRequirementTargetId,
  RequirementObservationHistory
>;

export type RequirementObservations = HashMap.HashMap<
  MilestoneRequirementEventType,
  RequirementObservationsByTargetId
>;

export type MilestoneProcessorState = {
  readonly requirementObservations: RequirementObservations;
};

export const initialMilestoneProcessorState: MilestoneProcessorState = {
  requirementObservations: HashMap.empty(),
};

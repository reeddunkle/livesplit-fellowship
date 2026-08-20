import type * as DateTime from "effect/DateTime";
import * as HashMap from "effect/HashMap";

import { type MilestoneRequirementId } from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";
import { type MilestoneRequirementEventType } from "@/services/fellowship/validation/milestone-requirement-event-type-schema.ts";

type RequirementObservation = {
  readonly timestamp: DateTime.Utc;
};

export type ObservedRequirement = {
  readonly observations: ReadonlyArray<RequirementObservation>;
};

export type ObservedRequirementsById = HashMap.HashMap<
  MilestoneRequirementId,
  ObservedRequirement
>;

export type ObservedRequirements = HashMap.HashMap<
  MilestoneRequirementEventType,
  ObservedRequirementsById
>;

export type MilestoneProcessorState = {
  readonly observedMilestones: HashMap.HashMap<string, FellowshipRunMilestone>;
  readonly observedRequirements: HashMap.HashMap<string, ObservedRequirements>;
};

export const initialMilestoneProcessorState: MilestoneProcessorState = {
  observedMilestones: HashMap.empty(),
  observedRequirements: HashMap.empty(),
};

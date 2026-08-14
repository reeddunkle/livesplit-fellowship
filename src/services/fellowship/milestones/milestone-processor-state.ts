import * as HashMap from "effect/HashMap";

import {
  type MilestoneRequirementEventType,
  type MilestoneRequirementId,
} from "@/services/fellowship/milestones/milestone-requirement-lookup.ts";
import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";

export type ObservedRequirementCountsById = HashMap.HashMap<
  MilestoneRequirementId,
  number
>;

export type ObservedRequirementCounts = HashMap.HashMap<
  MilestoneRequirementEventType,
  ObservedRequirementCountsById
>;

export type MilestoneProcessorState = {
  readonly observedMilestones: HashMap.HashMap<string, FellowshipRunMilestone>;
  readonly observedRequirementCounts: HashMap.HashMap<
    string,
    ObservedRequirementCounts
  >;
};

export const initialMilestoneProcessorState: MilestoneProcessorState = {
  observedMilestones: HashMap.empty(),
  observedRequirementCounts: HashMap.empty(),
};

import * as HashMap from "effect/HashMap";

import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";

export type ObservedRequirementCounts = HashMap.HashMap<string, number>;

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

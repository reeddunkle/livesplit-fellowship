import * as HashMap from "effect/HashMap";
import type * as HashSet from "effect/HashSet";

import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";

export type MilestoneProcessorState = {
  readonly observedMilestones: HashMap.HashMap<string, FellowshipRunMilestone>;
  readonly satisfiedRequirementIndexes: HashMap.HashMap<
    string,
    HashSet.HashSet<number>
  >;
};

export const initialMilestoneProcessorState: MilestoneProcessorState = {
  observedMilestones: HashMap.empty(),
  satisfiedRequirementIndexes: HashMap.empty(),
};

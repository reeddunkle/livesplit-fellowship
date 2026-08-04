import * as HashMap from "effect/HashMap";

import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";

export type MilestoneProcessorState = {
  readonly observedMilestones: HashMap.HashMap<string, FellowshipRunMilestone>;
  readonly unitDeathCounts: HashMap.HashMap<number, number>;
};

export const initialMilestoneProcessorState: MilestoneProcessorState = {
  observedMilestones: HashMap.empty(),
  unitDeathCounts: HashMap.empty(),
};

import * as E from "effect/Effect";

import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";

export type HandleLiveMilestoneOptions = {
  readonly milestone: FellowshipRunMilestone;
};

export function handleLiveMilestone({
  milestone,
}: HandleLiveMilestoneOptions): E.Effect<void> {
  return E.logInfo("Milestone completed.", {
    elapsedMilliseconds: milestone.elapsedMilliseconds,
    label: milestone.label,
    milestoneId: milestone.milestoneId,
    type: milestone.type,
  });
}

import {
  initialMilestoneProcessorState,
  type MilestoneProcessorState,
} from "@/services/fellowship/milestones/milestone-processor-state.ts";
import {
  type DungeonRunTrackerState,
  initialDungeonRunTrackerState,
} from "@/services/fellowship/runs/track-dungeon-run.ts";
import { type FellowshipRunMilestone } from "@/services/fellowship/types.ts";

export type RunProcessingState = {
  readonly latestMilestone: FellowshipRunMilestone | undefined;
  readonly milestoneProcessor: MilestoneProcessorState;
  readonly runTracker: DungeonRunTrackerState;
};

export function createInitialRunState(): RunProcessingState {
  return {
    latestMilestone: undefined,
    milestoneProcessor: initialMilestoneProcessorState,
    runTracker: initialDungeonRunTrackerState,
  };
}

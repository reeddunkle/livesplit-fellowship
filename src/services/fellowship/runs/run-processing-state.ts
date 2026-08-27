import {
  initialMilestoneProcessorState,
  type MilestoneProcessorState,
} from "@/services/fellowship/milestones/milestone-processor-state.ts";
import {
  type DungeonRunTrackerState,
  initialDungeonRunTrackerState,
} from "@/services/fellowship/runs/track-dungeon-run.ts";

export type RunProcessingState = {
  readonly milestoneProcessor: MilestoneProcessorState;
  readonly runTracker: DungeonRunTrackerState;
};

export function createInitialRunState(): RunProcessingState {
  return {
    milestoneProcessor: initialMilestoneProcessorState,
    runTracker: initialDungeonRunTrackerState,
  };
}

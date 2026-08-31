import {
  type DungeonRunTrackerState,
  initialDungeonRunTrackerState,
} from "@/services/fellowship/dungeon-runs/track-dungeon-run.ts";
import {
  initialMilestoneProcessorState,
  type MilestoneProcessorState,
} from "@/services/fellowship/milestones/milestone-processor-state.ts";

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

import {
  type DungeonRunTrackerState,
  initialDungeonRunTrackerState,
} from "@/services/fellowship/dungeon-runs/track-dungeon-run.ts";
import {
  initialMilestoneProcessorState,
  type MilestoneProcessorState,
} from "@/services/fellowship/milestones/milestone-processor-state.ts";

export type DungeonRunProcessingState = {
  readonly milestoneProcessor: MilestoneProcessorState;
  readonly runTracker: DungeonRunTrackerState;
};

export function createInitialDungeonRunState(): DungeonRunProcessingState {
  return {
    milestoneProcessor: initialMilestoneProcessorState,
    runTracker: initialDungeonRunTrackerState,
  };
}

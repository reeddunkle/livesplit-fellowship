import {
  type DungeonRunTrackerState,
  initialDungeonRunTrackerState,
} from "@/services/fellowship/dungeon-runs/track-dungeon-run.ts";
import {
  initialRequirementProcessorState,
  type RequirementProcessorState,
} from "@/services/fellowship/requirements/requirement-processor-state.ts";

export type DungeonRunProcessingState = {
  readonly requirementProcessor: RequirementProcessorState;
  readonly runTracker: DungeonRunTrackerState;
};

export function createInitialDungeonRunState(): DungeonRunProcessingState {
  return {
    requirementProcessor: initialRequirementProcessorState,
    runTracker: initialDungeonRunTrackerState,
  };
}

import {
  initialMilestoneProcessorState,
  type MilestoneProcessorState,
} from "@/services/fellowship/milestones/milestone-processor-state.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { processMilestoneEvent } from "@/services/fellowship/milestones/process-milestone-event.ts";
import {
  type FellowshipRunMilestone,
  type RawFellowshipDungeonRun,
} from "@/services/fellowship/types.ts";

export type CreateRunMilestonesOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly run: RawFellowshipDungeonRun;
};

type CreateRunMilestonesState = {
  readonly milestones: ReadonlyArray<FellowshipRunMilestone>;
  readonly processor: MilestoneProcessorState;
};

export function createRunMilestones({
  configuration,
  run,
}: CreateRunMilestonesOptions): ReadonlyArray<FellowshipRunMilestone> {
  const finalState = run.events.reduce<CreateRunMilestonesState>(
    (state, event) => {
      const result = processMilestoneEvent({
        configuration,
        event,
        runStart: run.start,
        state: state.processor,
      });

      return {
        milestones: [...state.milestones, ...result.milestones],
        processor: result.state,
      };
    },
    {
      milestones: [],
      processor: initialMilestoneProcessorState,
    },
  );

  return finalState.milestones;
}

import {
  type FellowshipMilestoneConfiguration,
  type FellowshipSplitModel,
} from "@/services/fellowship/milestones/milestone-types.ts";
import { type AnalyzedFellowshipDungeonRun } from "@/services/fellowship/types.ts";

export type CreateSplitModelFromRunOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly run: AnalyzedFellowshipDungeonRun;
};

export function createSplitModelFromRun({
  configuration,
  run,
}: CreateSplitModelFromRunOptions): FellowshipSplitModel {
  const configuredMilestoneIds = new Set(
    configuration.milestones.map((milestone) => {
      return milestone.milestoneId;
    }),
  );

  const milestoneIds = run.milestones
    .filter((milestone) => {
      return configuredMilestoneIds.has(milestone.milestoneId);
    })
    .toSorted((left, right) => {
      return left.elapsedMilliseconds - right.elapsedMilliseconds;
    })
    .map((milestone) => {
      return milestone.milestoneId;
    });

  return {
    milestoneIds,
  };
}

import {
  type FellowshipMilestoneConfiguration,
  type FellowshipSplitModel,
} from "@/services/fellowship/milestones/milestone-types.ts";
import {
  type FellowshipGoalData,
  type FellowshipSplitResult,
} from "@/services/fellowship/types.ts";

export type CreateGoalDataOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly splitModel: FellowshipSplitModel;
  readonly splitResults: ReadonlyArray<FellowshipSplitResult>;
};

export function createGoalData({
  configuration,
  splitModel,
  splitResults,
}: CreateGoalDataOptions): FellowshipGoalData {
  return {
    configuration,
    milestones: splitResults.map((splitResult) => {
      return {
        elapsedMilliseconds: splitResult.elapsedMilliseconds,
        milestoneId: splitResult.milestoneId,
      };
    }),
    splitModel,
  };
}

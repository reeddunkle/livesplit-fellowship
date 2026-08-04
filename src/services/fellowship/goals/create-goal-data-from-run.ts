import * as E from "effect/Effect";

import { type FellowshipSplitModelError } from "@/errors/fellowship-split-model-error.ts";
import { createGoalData } from "@/services/fellowship/goals/create-goal-data.ts";
import { type FellowshipMilestoneConfiguration } from "@/services/fellowship/milestones/milestone-types.ts";
import { applySplitModel } from "@/services/fellowship/splits/apply-split-model.ts";
import { createSplitModelFromRun } from "@/services/fellowship/splits/create-split-model-from-run.ts";
import {
  type AnalyzedFellowshipDungeonRun,
  type FellowshipGoalData,
} from "@/services/fellowship/types.ts";

export type CreateGoalDataFromRunOptions = {
  readonly configuration: FellowshipMilestoneConfiguration;
  readonly run: AnalyzedFellowshipDungeonRun;
};

export function createGoalDataFromRun({
  configuration,
  run,
}: CreateGoalDataFromRunOptions): E.Effect<
  FellowshipGoalData,
  FellowshipSplitModelError
> {
  return E.gen(function* () {
    const splitModel = createSplitModelFromRun({
      configuration,
      run,
    });

    const splitResults = yield* applySplitModel({
      configuration,
      milestones: run.milestones,
      splitModel,
    });

    return createGoalData({
      configuration,
      splitModel,
      splitResults,
    });
  });
}
